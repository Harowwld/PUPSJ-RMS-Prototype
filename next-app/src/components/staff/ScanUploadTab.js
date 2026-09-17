"use client"

import LucideIcon from "@/components/shared/LucideIcon";
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
import { TooltipProvider } from "@/components/ui/tooltip"
import ConfirmModal from "@/components/shared/ConfirmModal"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import ScanUploadSkeleton from "@/components/staff/skeletons/ScanUploadSkeleton"
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
import ContinuousScanningPanel from "@/components/staff/ContinuousScanningPanel"
function toNormalCase(str) {
  if (!str) return ""
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const COORDINATE_REGION_LABELS = {
  firstName: { label: "First name", color: "#2563eb" },
  middleName: { label: "Middle name", color: "#9333ea" },
  lastName: { label: "Last name", color: "#dc2626" },
}

export default function ScanUploadTab({
  authUser = null,
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
  ocrSuggestion = null,
  rotation = 0,
  setRotation,
  onOpenBatchReview,
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
    <TooltipProvider delayDuration={200}>
      <div
        id="view-upload"
        className="font-inter w-full flex flex-1 flex-col h-auto min-h-0 focus:outline-none animate-fade-up"
      >
        <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-inter mb-4 min-h-0 flex-1">
          <PageHeader
            icon="ph-scan"
            title="Scan & Upload"
            description="Scan student records or import files to save them digitally."
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
            actions={
              uploadMode === "pdf" && (
                <RefreshButton
                  onRefresh={(e) => {
                    e?.stopPropagation?.()
                    hf.refresh()
                  }}
                  isLoading={hf.loading}
                  title="Refresh Scanner Inbox"
                />
              )
            }
          />

          {/* Workstation Hardware & Digitization Path Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2 bg-slate-50/70 dark:bg-zinc-900/60 border-t border-b border-gray-100 dark:border-white/5 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  Workstation:
                </span>
                <span className="font-semibold text-gray-800 dark:text-zinc-200">
                  {authUser?.station_name || `${(authUser?.office_id || "REG").toUpperCase()}-ARCHIVE-PC01`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LucideIcon  className="ph-bold ph-hard-drives text-pup-maroon dark:text-red-400 text-xs"></LucideIcon>
              <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                Digitization Save Path:
              </span>
              <span 
                className="text-[11px] font-medium text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2.5 py-0.5 rounded-lg truncate max-w-[340px]"
                title={authUser?.storage_path || `.local/storage/${authUser?.office_id || "registrar"}/uploads`}
              >
                {authUser?.storage_path || `.local/storage/${authUser?.office_id || "registrar"}/uploads`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LucideIcon  className="ph-bold ph-folder-open text-pup-maroon dark:text-red-400 text-xs"></LucideIcon>
              <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                Scanner Inbound:
              </span>
              <span
                className="text-[11px] font-medium text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2.5 py-0.5 rounded-lg truncate max-w-[340px]"
                title={authUser?.inbound_path || ".local/hot-folder/INBOUND"}
              >
                {authUser?.inbound_path || ".local/hot-folder/INBOUND"}
              </span>
            </div>
          </div>

          {uploadMode === "pdf" && <ContinuousScanningPanel onOpenReview={onOpenBatchReview} showToast={showToast} />}

          {/* Mode Toggles as Sub-tabs */}
          <div className="flex items-center gap-6 shrink-0 h-9 px-6 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-card select-none">
            <button
              type="button"
              onClick={() => setUploadMode("pdf")}
              className={cn(
                "relative h-full flex items-center text-xs font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                uploadMode === "pdf"
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-pup-maroon dark:after:bg-red-500"
                  : "text-gray-500 font-normal hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              )}
            >
              Document
            </button>
            <button
              type="button"
              onClick={() => setUploadMode("csv")}
              className={cn(
                "relative h-full flex items-center text-xs font-semibold transition-colors focus:outline-none cursor-pointer border-0 bg-transparent",
                uploadMode === "csv"
                  ? "text-gray-900 dark:text-zinc-50 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-pup-maroon dark:after:bg-red-500"
                  : "text-gray-500 font-normal hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              )}
            >
              Batch (CSV)
            </button>
          </div>

          <CardContent className="flex flex-col p-6 pt-3 rounded-b-2xl">
          {loading ? (
            <ScanUploadSkeleton />
          ) : error ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
              <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-500 dark:text-zinc-400">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                    <LucideIcon  className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
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
                confirmLabel="Clear"
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
                confirmLabel="Replace"
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
                    "relative flex h-auto min-h-[580px] flex-col transition-all duration-normal",
                    uploadMode === "csv" ? "w-full lg:w-[68%]" : "w-full lg:w-[48%]"
                  )}
                >
                  {uploadMode === "csv" ? (
                    csvFile ? (
                      <div className="flex h-full w-full flex-col overflow-hidden bg-white transition-all duration-normal rounded-2xl border border-gray-200 dark:bg-card dark:border-white/10">
                        <div className="flex flex-col items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-5 px-6 sm:flex-row dark:border-white/10 dark:bg-white/5">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="text-base font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                                CSV Preview
                              </h3>
                              <div className="mt-1 text-xs font-normal text-gray-500 dark:text-zinc-400">
                                <div className="flex flex-col gap-0.5">
                                  <span className="break-all text-pup-maroon dark:text-red-400 font-medium text-xs">
                                    {csvFile.name}
                                  </span>
                                  <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500">
                                    {csvRows.length} rows detected ·{" "}
                                    {csvRows.filter((r) => r.error).length} invalid
                                    rows
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <div className="relative group w-48 sm:w-64">
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <LucideIcon  className="ph-bold ph-magnifying-glass text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400 text-sm"></LucideIcon>
                              </div>
                              <Input
                                type="text"
                                className="h-9 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 pl-9 pr-4 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                                placeholder="Search records..."
                                value={localCsvSearch}
                                onChange={(e) => setLocalCsvSearch(e.target.value)}
                              />
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCsvFileSelect(null)}
                              className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                            >
                              Clear
                            </Button>
                          </div>
                        </div>

                        <div
                          className={`relative min-h-0 flex-1 overflow-auto transition-colors duration-fast ${csvDropActive ? "bg-[#FAFAFA]" : ""} dark:bg-[#2c2c2c]`}
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
                                  <LucideIcon  className="ph-duotone ph-file-csv text-xl text-[#0A84FF] dark:text-primary animate-bounce"></LucideIcon>
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
                                  <th className="p-4 whitespace-nowrap">Student No</th>
                                  <th className="p-4 whitespace-nowrap">Name</th>
                                  <th className="p-4 whitespace-nowrap">Course</th>
                                  <th className="p-4 whitespace-nowrap">Year</th>
                                  <th className="p-4 whitespace-nowrap">Section</th>
                                  <th className="p-4 px-2 whitespace-nowrap text-left w-[90px]">Room</th>
                                  <th className="p-4 px-2 whitespace-nowrap text-left w-[90px]">Cabinet</th>
                                  <th className="p-4 px-2 whitespace-nowrap text-left w-[90px]">Drawer</th>
                                  <th className="p-4 text-right whitespace-nowrap">Status</th>
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
                                        "group h-[52px] border-b-[0.5px] border-gray-100 dark:border-white/10 last:border-b-0 transition-all duration-fast hover:bg-gray-50/40 dark:bg-card dark:hover:bg-white/2 select-none cursor-pointer",
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
                                      <td className="py-0 px-4 align-middle text-[13px] font-medium tracking-[-0.01em] text-gray-900 dark:text-zinc-50 whitespace-nowrap">
                                        {r.student.studentNo}
                                      </td>
                                      <td className="py-0 px-4 align-middle text-[13px] font-medium tracking-[-0.01em] text-gray-900 dark:text-zinc-50 whitespace-nowrap">
                                        {toNormalCase(r.student.name)}
                                      </td>
                                      <td className="py-0 px-4 align-middle whitespace-nowrap">
                                        <span className="inline-flex w-fit items-center justify-center rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-900 dark:bg-zinc-800 dark:text-zinc-100">
                                          {r.student.courseCode}
                                        </span>
                                      </td>
                                      <td className="py-0 px-4 align-middle text-[13px] font-medium tracking-[-0.01em] text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                                        {r.student.yearLevel}
                                      </td>
                                      <td className="py-0 px-4 align-middle text-[13px] font-medium tracking-[-0.01em] text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                                        {r.student.section}
                                      </td>
                                      <td className="py-0 px-2 align-middle w-[90px]" onClick={(e) => e.stopPropagation()}>
                                        <Select
                                          className="h-8 w-20 rounded-lg border border-gray-200 px-2 py-0 text-[11px] font-normal dark:border-white/10 shadow-none"
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
                                      <td className="py-0 px-2 align-middle w-[90px]" onClick={(e) => e.stopPropagation()}>
                                        <Select
                                          className="h-8 w-20 rounded-lg border border-gray-200 px-2 py-0 text-[11px] font-normal dark:border-white/10 shadow-none"
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
                                      <td className="py-0 px-2 align-middle w-[90px]" onClick={(e) => e.stopPropagation()}>
                                        <Select
                                          className="h-8 w-20 rounded-lg border border-gray-200 px-2 py-0 text-[11px] font-normal dark:border-white/10 shadow-none"
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
                                        <div className="inline-flex items-center justify-end">
                                          {r.error ? (
                                            <LucideIcon 
                                              className="ph-bold ph-x-circle text-red-500 dark:text-red-400 text-[18px]"
                                              title={`Error: ${r.error}`}
                                            />
                                          ) : !isValid ? (
                                            <LucideIcon 
                                              className="ph-bold ph-warning-circle text-amber-500 dark:text-amber-400 text-[18px]"
                                              title="Invalid: This location does not exist in the physical system."
                                            />
                                          ) : (
                                            <LucideIcon 
                                              className="ph-bold ph-check-circle text-emerald-500 dark:text-emerald-400 text-[18px]"
                                              title="Valid location"
                                            />
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <Empty className="py-12">
                              <EmptyMedia>
                                <LucideIcon  className="ph-magnifying-glass" />
                              </EmptyMedia>
                              <EmptyTitle>No Matches Found</EmptyTitle>
                              <EmptyDescription>
                                We couldn&apos;t find any rows matching &quot;{csvSearch}&quot;.
                              </EmptyDescription>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocalCsvSearch("")}
                                className="mt-6 h-9 rounded-xl border border-gray-200 dark:border-white/10 px-5 text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 shadow-xs cursor-pointer active:scale-95"
                              >
                                Clear
                              </Button>
                            </Empty>
                          )}
                        </div>

                        {filteredCsvRows.length > 0 && (
                          <div className="flex items-center justify-between border-t border-gray-100 bg-white p-5 px-6 dark:border-white/10 dark:bg-card">
                            <div className="flex items-center gap-8">
                              <div className="flex items-center gap-6 text-xs font-normal text-gray-400 dark:text-zinc-500">
                                <span>
                                  Showing {paginatedCsvRows.length} of {filteredCsvRows.length}
                                </span>
                                <div className="flex items-center gap-1.5 border-l border-gray-200 pl-6 dark:border-white/10">
                                  <span className="text-xs text-gray-400 dark:text-zinc-500">Rows:</span>
                                  <div className="flex items-center gap-1">
                                    {[10, 20, 50, 100].map((size) => (
                                      <button
                                        key={size}
                                        type="button"
                                        onClick={() => {
                                          setCsvRowsPerPage(size)
                                          setCsvPage(1)
                                        }}
                                        className={cn(
                                          "px-2 py-0.5 rounded-lg text-xs font-normal cursor-pointer transition-colors border-0",
                                          csvRowsPerPage === size
                                            ? "bg-gray-100 text-gray-900 font-semibold dark:bg-white/10 dark:text-zinc-50"
                                            : "bg-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
                                        )}
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
                                className="h-8 bg-transparent text-xs font-medium text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
                              >
                                Prev
                              </button>

                              <div className="flex h-8 min-w-[32px] items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-100">
                                {csvPage}
                              </div>

                              <button
                                disabled={csvPage >= Math.ceil(filteredCsvRows.length / csvRowsPerPage)}
                                onClick={() => setCsvPage((p) => Math.min(Math.ceil(filteredCsvRows.length / csvRowsPerPage), p + 1))}
                                className="h-8 bg-transparent text-xs font-medium text-gray-400 hover:text-pup-maroon dark:text-zinc-500 dark:hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer border-0 p-0"
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
                          "group relative flex min-h-[580px] flex-1 cursor-pointer flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 transition-all duration-150 ease-out hover:border-pup-maroon/40 dark:bg-zinc-900/30 dark:border-white/10 dark:hover:border-red-500/40",
                          csvDropActive ? "border-pup-maroon bg-red-50/10 dark:border-red-500/80" : ""
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
                          <LucideIcon  className={cn("ph-bold ph-file-csv text-[32px] transition-colors duration-fast", csvDropActive ? "text-pup-maroon" : "text-gray-400 dark:text-zinc-500")}></LucideIcon>
                          <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mt-3 m-0">
                            Drop CSV File Here
                          </p>
                          <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 mt-1 m-0">
                            or click to <span className="text-pup-maroon dark:text-red-400 font-medium cursor-pointer hover:underline">browse</span> local files (.csv)
                          </p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col gap-4 w-full h-full">
                      <div
                        className={cn(
                          "group relative flex flex-1 min-h-[580px] w-full flex-col overflow-hidden rounded-2xl border transition-all duration-150 ease-out",
                          uploadedFile ? "bg-white border-gray-200 dark:bg-card dark:border-white/10" : "bg-gray-50/50 border-2 border-dashed border-gray-200 dark:bg-zinc-900/30 dark:border-white/10 hover:border-pup-maroon/40 dark:hover:border-red-500/40",
                          fe.pdfFile ? "border-amber-400 bg-amber-50/20" : ""
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
                            className="relative flex-1 flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-fast dark:bg-card"
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
                            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 bg-white px-5 py-3 dark:border-white/10 dark:bg-card">
                          <div className="min-w-0">
                            <div className="text-xs font-normal text-gray-500 dark:text-zinc-400">
                              {hf.selectedRow ? "Scanner Preview" : "Document Preview"}
                            </div>
                            <div className="truncate text-sm font-semibold text-pup-maroon dark:text-red-400">
                              {hf.selectedRow?.original_filename || uploadedFile?.name}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {(hf.ocrLoading || ocrLoading) && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 font-semibold text-[10px] tracking-wider animate-pulse dark:bg-amber-950/20 dark:border-amber-900/30">
                                <LucideIcon  className="ph-bold ph-spinner animate-spin" />
                                OCR Active
                              </div>
                            )}
                             {uploadedFiles && uploadedFiles.length > 1 && !hf.selectedRow && (
                               <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 onClick={() => setShowPagesSidebar(!showPagesSidebar)}
                                 className="h-8 px-3 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95"
                               >
                                 {showPagesSidebar ? "Hide" : "Show"}
                               </Button>
                             )}
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95"
                              onClick={() => setRotation((r) => r - 90)}
                              title="Rotate Left"
                            >
                              <LucideIcon  className="ph-bold ph-arrow-counter-clockwise text-xs" />
                            </button>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95"
                              onClick={() => setRotation((r) => r + 90)}
                              title="Rotate Right"
                            >
                              <LucideIcon  className="ph-bold ph-arrow-clockwise text-xs" />
                            </button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="ml-1 h-8 px-3 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95"
                              onClick={() => {
                                if (hf.selectedRow) {
                                  hf.clearIngestSelection()
                                }
                                handleClearPdf()
                              }}
                            >
                              <LucideIcon  className="ph-bold ph-x text-xs mr-1" />
                              Close
                            </Button>
                          </div>
                        </div>
                        <div className="min-h-0 flex-1 flex overflow-hidden bg-gray-100 relative dark:bg-muted">
                          {uploadedFiles && uploadedFiles.length > 1 && !hf.selectedRow && showPagesSidebar && (
                            <div className="w-1/3 min-w-[200px] max-w-[280px] border-r border-gray-200 bg-white/95 backdrop-blur-md flex flex-col min-h-0 overflow-y-auto p-4 gap-3 dark:border-white/10 dark:bg-card/95 shrink-0 z-10">
                              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
                                <span className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500">
                                  Scan Pages ({uploadedFiles.length})
                                </span>
                                <span className="text-[10px] font-semibold text-pup-maroon dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
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
                                      className={cn(
                                        "group flex flex-col gap-1 rounded-xl border p-3 text-left cursor-pointer transition-all",
                                        isSelected
                                          ? "border-pup-maroon bg-red-50/40 dark:border-red-500 dark:bg-zinc-800"
                                          : "border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10"
                                      )}
                                    >
                                      <div className="flex items-center justify-between gap-1.5">
                                        <span className="truncate text-xs font-semibold text-gray-900 dark:text-zinc-50">
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
                                            className="p-0.5 text-gray-400 hover:text-gray-900 disabled:opacity-30 dark:hover:text-zinc-200 cursor-pointer"
                                            title="Move Up"
                                          >
                                            <LucideIcon  className="ph-bold ph-caret-up text-xs" />
                                          </button>
                                          <button
                                            type="button"
                                            disabled={idx === uploadedFiles.length - 1}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onReorderQueuedFiles(idx, 1);
                                            }}
                                            className="p-0.5 text-gray-400 hover:text-gray-900 disabled:opacity-30 dark:hover:text-zinc-200 cursor-pointer"
                                            title="Move Down"
                                          >
                                            <LucideIcon  className="ph-bold ph-caret-down text-xs" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onRemoveQueuedFile(idx);
                                            }}
                                            className="p-0.5 text-red-500 hover:text-red-700 cursor-pointer"
                                            title="Remove Page"
                                          >
                                            <LucideIcon  className="ph-bold ph-trash text-xs" />
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
                                className="mt-auto flex h-9 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 shadow-xs transition-all hover:bg-gray-50 dark:bg-card dark:border-white/10 dark:text-zinc-300 cursor-pointer active:scale-95"
                              >
                                <LucideIcon  className="ph-bold ph-plus text-xs" /> Add Page
                              </button>
                            </div>
                          )}

                          <div className="flex-1 relative flex h-full items-center justify-center p-4">
                            {(() => {
                              const url = hf.selectedRow ? hf.previewUrl : manualPreviewUrl
                              const mime = hf.selectedRow ? hf.previewMime : uploadedFile?.type
                              const isImg = String(mime || "").startsWith("image/")
                              const coordinateRegions = ocrSuggestion?.coordinateRecognition?.regions

                              if (isImg || pdfPreviewDataUrl) {
                                return (
                                  <div className="relative flex max-h-full max-w-full" style={{ transform: `rotate(${rotation}deg)` }}>
                                    <img
                                      src={isImg ? url : pdfPreviewDataUrl}
                                      alt="Preview"
                                      className="max-h-full max-w-full rounded-md object-contain shadow-2xl transition-transform duration-normal"
                                      draggable="false"
                                    />
                                    {Object.entries(coordinateRegions || {}).map(([key, region]) => {
                                      const field = COORDINATE_REGION_LABELS[key]
                                      if (!field || Number(region?.width) <= 0 || Number(region?.height) <= 0) return null
                                      return (
                                        <div
                                          key={key}
                                          className="pointer-events-none absolute border-2"
                                          style={{
                                            left: `${Number(region.x) * 100}%`,
                                            top: `${Number(region.y) * 100}%`,
                                            width: `${Number(region.width) * 100}%`,
                                            height: `${Number(region.height) * 100}%`,
                                            borderColor: field.color,
                                          }}
                                        >
                                          <span className="absolute -top-5 left-0 whitespace-nowrap bg-white px-1 text-[10px] font-semibold" style={{ color: field.color }}>
                                            {field.label}
                                          </span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )
                              }

                            if (pdfRendering) {
                              return (
                                <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100 p-8 dark:bg-muted">
                                  <div className="h-10 w-10 animate-spin rounded-full border border-gray-300 border-t-pup-maroon mb-3 dark:border-white/10 dark:border-t-red-500" />
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
                              className="absolute inset-0 z-30 flex items-center justify-center bg-gray-500/10 backdrop-blur-md border border-gray-200 rounded-2xl animate-fade-up dark:bg-white/5"
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
                              <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-200 shadow-xl max-w-xs text-center pointer-events-none animate-scale-up dark:bg-card dark:border-white/10">
                                <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mb-3 dark:bg-muted">
                                  <LucideIcon  className="ph-bold ph-upload-simple text-xl text-gray-400 animate-bounce"></LucideIcon>
                                </div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                  Drop file here to replace preview
                                </p>
                                <p className="text-xs font-normal text-gray-500 mt-1.5 dark:text-zinc-400">
                                  Requires Confirmation
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        </div>
                        ) : (
                          <div
                            className="relative flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center p-6"
                          >
                            <input
                              type="file"
                              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                              accept=".pdf,image/*"
                              multiple
                              onChange={(e) => handlePdfFileSelect(e.target.files)}
                            />
                            <div className="pointer-events-none flex flex-col items-center justify-center text-center w-full h-full">
                              <LucideIcon  className={cn("ph-bold ph-upload-simple text-[32px] transition-colors duration-fast", dropActive ? "text-pup-maroon" : "text-gray-400 dark:text-zinc-500")}></LucideIcon>
                              <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mt-3 m-0">
                                Drop Document Or Image Here
                              </p>
                              <p className="text-xs font-normal text-gray-500 dark:text-zinc-400 mt-1 m-0">
                                or click to <span className="text-pup-maroon dark:text-red-400 font-medium cursor-pointer hover:underline">browse</span> local files (PDF, JPG, PNG)
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
                                className="flex items-center gap-2 h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95"
                              >
                                <LucideIcon  className="ph-bold ph-clipboard-text text-sm"></LucideIcon>
                                Paste
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
                  className={cn(
                    "font-inter flex h-fit flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-normal dark:border-white/10 dark:bg-card dark:shadow-none",
                    uploadMode === "csv" ? "w-full lg:w-[32%]" : "lg:w-[52%]"
                  )}
                >
                  <div className="flex flex-col gap-1 border-b border-gray-100 bg-transparent p-5 dark:border-white/10">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-50 m-0">
                      {uploadMode === "csv" ? "Bulk Upload" : "Label Document"}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 m-0 leading-normal">
                      {uploadMode === "csv"
                        ? "Review rows, bulk-edit locations, then import students."
                        : uploadedFile
                          ? "Review scanned information and fill in missing fields."
                          : "Drop or select a file on the left, then fill in the form here."}
                    </p>
                  </div>

                  <div className="p-5 bg-white dark:bg-transparent">
                    {uploadMode === "pdf" ? (
                      <div className="space-y-5">
                        {ocrSuggestion && (
                          <div className="grid grid-cols-2 gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-400/20 dark:bg-blue-950/20">
                            <div><div className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">Student match</div><div className="text-lg font-bold text-blue-900 dark:text-blue-100">{ocrSuggestion.matchPercent != null ? `${ocrSuggestion.matchPercent}%` : "—"}</div><div className="text-[11px] text-blue-700 dark:text-blue-300">{ocrSuggestion.matchBand || ocrSuggestion.matchStatus || "Not scored"}</div></div>
                            <div><div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">OCR read quality</div><div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{ocrSuggestion.ocrQualityPercent != null ? `${ocrSuggestion.ocrQualityPercent}%` : "—"}</div><div className="text-[11px] text-emerald-700 dark:text-emerald-300">{ocrSuggestion.ocrQualityBand || "Not scored"}</div></div>
                            {ocrSuggestion.matchEvidence?.reason && <div className="col-span-2 border-t border-blue-100 pt-2 text-[11px] text-gray-600 dark:border-blue-400/20 dark:text-zinc-300">{ocrSuggestion.matchEvidence.reason}</div>}
                          </div>
                        )}
                        {uploadStudentIsExisting && (
                          <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 dark:border-emerald-500/20 dark:bg-emerald-950/20">
                             <span className="inline-flex items-start gap-2 text-[11px] font-medium tracking-[0.04em] text-emerald-900 dark:text-emerald-400">
                              <LucideIcon 
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
                              className="shrink-0 text-left text-xs font-semibold text-pup-maroon dark:text-red-400 underline-offset-2 hover:underline cursor-pointer"
                              onClick={() => {
                                setUploadStudentIsExisting(false)
                                clearAllUploadFieldErrors?.()
                              }}
                            >
                              Switch to new student
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-5">
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <label
                                className={`block text-xs font-medium ${ lockIdentity ? lockedLabel : "text-gray-500" } dark:text-zinc-400`}
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
                                  className="h-6 rounded-lg px-2 text-xs font-semibold text-pup-maroon dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                            <div className="relative">
                              <Input
                                type="text"
                                className={cn(
                                  "h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all",
                                  ring("studentNo"),
                                  lockIdentity && lockedField
                                )}
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
                                <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden shadow-xl p-1 animate-in fade-in slide-in-from-top-1 duration-fast">
                                  {filteredStudentNoSuggestions.map((s) => {
                                    const sn = String(s?.studentNo || s?.student_no || "");
                                    return (
                                      <button
                                        key={sn}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group flex flex-col gap-0.5 cursor-pointer"
                                        onClick={() => handleSelectStudent(s)}
                                      >
                                        <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
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
                                className={`mb-2 block text-xs font-medium ${lockedLabel} dark:text-zinc-400`}
                              >
                                Full Name
                              </label>
                              <Input
                                type="text"
                                className={cn(
                                  "h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs font-normal transition-all",
                                  lockedField
                                )}
                                value={newRec.name}
                                disabled
                              />
                            </div>
                          ) : (
                            <div>
                              <label
                                className="mb-2 block text-xs font-medium text-gray-500 dark:text-zinc-400"
                              >
                                Full Name (LN, FN MI.)
                              </label>
                              <div className="relative">
                                <Input
                                  type="text"
                                  className={cn(
                                    "h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all",
                                    ring("name")
                                  )}
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
                                  <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden shadow-xl p-1 animate-in fade-in slide-in-from-top-1 duration-fast">
                                    {filteredNameSuggestions.map((s) => {
                                      const sn = String(s?.studentNo || s?.student_no || "");
                                      return (
                                        <button
                                          key={sn}
                                          type="button"
                                          onMouseDown={(e) => e.preventDefault()}
                                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group flex flex-col gap-0.5 cursor-pointer"
                                          onClick={() => handleSelectStudent(s)}
                                        >
                                          <div className="text-xs font-semibold text-gray-900 dark:text-zinc-100 group-hover:text-pup-maroon dark:group-hover:text-red-400 transition-colors">
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
                            className={`mb-2 block text-xs font-medium ${ lockIdentity ? lockedLabel : "text-gray-500" } dark:text-zinc-400`}
                          >
                            Course / Program
                          </label>
                          <Select
                            placeholder="Select Course"
                            className={cn(
                              "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
                              ring("course"),
                              lockIdentity && lockedField
                            )}
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
                            className={`mb-2 block text-xs font-medium ${ lockIdentity ? lockedLabel : "text-gray-500" } dark:text-zinc-400`}
                          >
                            Section
                          </label>
                          <Select
                            placeholder="Select Section"
                            className={cn(
                              "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
                              ring("sectionPart"),
                              lockIdentity && lockedField
                            )}
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

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-zinc-400">
                              Room
                            </label>
                            <Select
                              placeholder=""
                              className={cn(
                                "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
                                ring("room")
                              )}
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
                            <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-zinc-400">
                              Cabinet
                            </label>
                            <Select
                              placeholder=""
                              className={cn(
                                "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
                                ring("cabinet")
                              )}
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
                            <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-zinc-400">
                              Drawer
                            </label>
                            <Select
                              placeholder=""
                              className={cn(
                                "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
                                ring("drawer")
                              )}
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

                        <div className="border-t border-gray-100 pt-5 dark:border-white/10">
                          <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-zinc-400">
                            Document Type
                          </label>
                          <Select
                            placeholder="Select Document type"
                            className={cn(
                              "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
                              ring("docType")
                            )}
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

                        {/* Target Digitization Storage Destination */}
                        <div className="rounded-xl border border-gray-200/80 bg-slate-50/60 p-3.5 dark:border-white/10 dark:bg-white/5 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-zinc-200 text-xs">
                              <LucideIcon  className="ph-bold ph-hard-drives text-pup-maroon dark:text-red-400"></LucideIcon>
                              <span>Digitization Destination</span>
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
                              Local Partition
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-normal">
                            Scanned document will be saved directly into this station&apos;s isolated directory:
                          </p>
                          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-700 dark:text-zinc-300 break-all">
                            <LucideIcon  className="ph-bold ph-folder-notch-open text-amber-600 dark:text-amber-400 shrink-0"></LucideIcon>
                            <span>{authUser?.storage_path || `.local/storage/${authUser?.office_id || "registrar"}/uploads`}</span>
                          </div>
                        </div>

                        <Button
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
                          className="w-full h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                          style={{ color: "#ffffff" }}
                        >
                          Upload
                        </Button>

                        {uploadError ? (
                          <div className="mt-3 rounded-brand border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800 dark:bg-red-950/30">
                            {uploadError}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-xs font-medium text-gray-500 dark:text-zinc-400">
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
                              <div className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 transition-all hover:bg-gray-50 dark:bg-card dark:border-white/10">
                                <LucideIcon  className="ph-bold ph-file-csv text-gray-400 dark:text-zinc-500"></LucideIcon>
                                <span className="truncate text-xs font-semibold text-gray-900 dark:text-zinc-300">
                                  {csvFile ? csvFile.name : "Select CSV..."}
                                </span>
                              </div>
                            </div>
                            {csvFile && (
                              <button
                                type="button"
                                onClick={() => handleCsvFileSelect(null)}
                                className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50 dark:bg-card dark:text-zinc-400 dark:border-white/10 cursor-pointer active:scale-95"
                                title="Clear File"
                              >
                                <LucideIcon  className="ph-bold ph-trash text-base transition-colors group-hover:text-red-500" />
                              </button>
                            )}
                          </div>
                        </div>

                        {csvError ? (
                          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:bg-red-950/30">
                            {csvError}
                          </div>
                        ) : null}

                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
                            <div className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                              Bulk Edit
                            </div>
                            <div className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                              <span className="font-semibold text-gray-900 dark:text-zinc-100">
                                {Object.values(csvSelected).filter(Boolean).length}
                              </span>{" "}
                              rows selected
                            </div>
                          </div>

                          <div className="space-y-3 pt-3">
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-zinc-400">
                                Room
                              </label>
                              <Select
                                className="h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 w-full text-xs text-gray-900 dark:text-zinc-200 shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all"
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
                              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-zinc-400">
                                Cabinet
                              </label>
                              <Select
                                className="h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 w-full text-xs text-gray-900 dark:text-zinc-200 shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all"
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
                              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-zinc-400">
                                Drawer
                              </label>
                              <Select
                                className="h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 w-full text-xs text-gray-900 dark:text-zinc-200 shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all"
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
                              <Button
                                type="button"
                                onClick={applyCsvBulkLocation}
                                className="flex-1 h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                                style={{ color: "#ffffff" }}
                                disabled={
                                  Object.values(csvSelected).filter(Boolean)
                                    .length === 0
                                }
                              >
                                Apply
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCsvSelected({})}
                                className="flex-1 h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                                disabled={
                                  Object.values(csvSelected).filter(Boolean)
                                    .length === 0
                                }
                              >
                                Clear
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-gray-100 pt-4 dark:border-white/10" />

                        {(() => {
                          const selectedIndices = Object.keys(csvSelected).filter(k => csvSelected[k])
                          const selectedRows = csvRows.filter(r => selectedIndices.includes(String(r.index)))
                          const hasInvalidSelected = selectedRows.some(r => !isLocationValid(r.student.room, r.student.cabinet, r.student.drawer))
                          const importDisabled = csvLoading || selectedRows.length === 0 || hasInvalidSelected

                          return (
                            <>
                              <Button
                                type="button"
                                onClick={importCsvStudents}
                                disabled={importDisabled}
                                className="w-full h-10 px-5 text-xs font-semibold rounded-xl! btn-brand-red text-white! active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                                style={{ color: "#ffffff" }}
                              >
                                {csvLoading ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <LucideIcon  className="ph-bold ph-spinner animate-spin text-sm" />
                                    <span>Importing...</span>
                                  </span>
                                ) : (
                                  "Import Students"
                                )}
                              </Button>

                              {hasInvalidSelected && (
                                <div className="mt-3 flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-[11px] font-semibold text-orange-800 animate-in fade-in slide-in-from-top-2 dark:bg-orange-950/20 dark:border-orange-900/30">
                                  <LucideIcon  className="ph-fill ph-warning-circle text-sm shrink-0" />
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
                          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none">
                            <div className="mb-2 text-[10px] font-semibold tracking-widest text-gray-400 dark:text-zinc-500">
                              Import Summary
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                <span className="flex items-center gap-1.5">
                                  <LucideIcon  className="ph-fill ph-check-circle text-emerald-500" />{" "}
                                  Created:
                                </span>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                                  {csvResults.filter((r) => r.ok).length}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-zinc-200">
                                <span className="flex items-center gap-1.5">
                                  <LucideIcon  className="ph-fill ph-x-circle text-red-500" />{" "}
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
  </TooltipProvider>
  )
}
