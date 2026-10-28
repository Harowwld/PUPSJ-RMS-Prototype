"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import { useMemo, useState, useEffect, useCallback } from "react"
import { useHotFolderInbox } from "@/hooks/useHotFolderInbox"
import { cn, formatTitleCase } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TooltipProvider } from "@/components/ui/tooltip"
import ConfirmModal from "@/components/shared/ConfirmModal"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
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
import { splitNameComponents } from "@/lib/ocrClient"
import ContinuousScanningPanel from "@/components/staff/ContinuousScanningPanel"

const COORDINATE_REGION_LABELS = {
  firstName: { label: "First name", color: "#2563eb" },
  middleName: { label: "Middle name", color: "#9333ea" },
  lastName: { label: "Last name", color: "#dc2626" },
}

export default function ScanUploadTab({
  authUser = null,
  loading,
  error = null,
  uploadStudentIsExisting,
  setUploadStudentIsExisting,
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
  students = [],
  organizations = [],
  staffDocs = [],
  rescanContext = null,
  isReplaceMode = false,
  setIsReplaceMode = () => {},
  onCancelRescan = () => {},
  checkDuplicate = () => {},
  onPreviewDocument = null,
  showToast = () => {},
  onIngestPromoted,
  onSelectExistingStudent,
  ocrSuggestion = null,
  rotation = 0,
  setRotation,
  onOpenBatchReview,
  isOsas: propIsOsas = null,
}) {
  const isOsas = Boolean(propIsOsas ?? ((authUser?.office_id || "").toLowerCase() === "osas"))
  const [clearInboxOpen, setClearInboxOpen] = useState(false)
  const [showPagesSidebar, setShowPagesSidebar] = useState(true)
  const [pendingDroppedFile, setPendingDroppedFile] = useState(null)
  const [confirmDropOpen, setConfirmDropOpen] = useState(false)
  const [windowDragActive, setWindowDragActive] = useState(false)

  const existingDocOnRecord = useMemo(() => {
    const cleanId = String(
      isOsas
        ? (newRec.organizationId || newRec.acronym || newRec.name || "")
        : (newRec.studentNo || "")
    ).trim().toUpperCase();
    const cleanType = String(newRec.docType || "").trim().toUpperCase();
    if (!cleanId || !cleanType) return null;

    return (
      staffDocs.find((d) => {
        const matchTarget = isOsas
          ? String(d.organization_id || "").trim().toUpperCase() === cleanId ||
            String(d.student_no || "").trim().toUpperCase() === cleanId
          : String(d.student_no || "").trim().toUpperCase() === cleanId;
        const matchType = String(d.doc_type || "").trim().toUpperCase() === cleanType;
        const notDeclined = String(d.approval_status || "").toLowerCase() !== "declined";
        return matchTarget && matchType && notDeclined;
      }) || null
    );
  }, [staffDocs, isOsas, newRec.organizationId, newRec.acronym, newRec.name, newRec.studentNo, newRec.docType]);

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


  const fe = uploadFieldErrors || {}
  const ring = (key) =>
    fe[key] ? "ring-2 ring-orange-400 border-orange-400" : ""

  const roomOptions = storageLayout?.rooms?.map((r) => r.id) || (isOsas ? [1] : [])
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

    if (isOsas) {
      const osasDefaults = ["ACADEMIC ORGANIZATIONS", "NON-ACADEMIC ORGANIZATIONS"]
      const allCabs = Array.from(new Set([...ids, ...osasDefaults]))
      if (cabId && !allCabs.includes(cabId)) return [cabId, ...allCabs]
      return allCabs
    }

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
      if (allDrawers.length === 0) return [1, 2, 3, 4]
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
    "!bg-gray-200 dark:bg-zinc-700 !text-gray-900 dark:text-zinc-300 !border-border dark:border-border cursor-not-allowed placeholder:!text-gray-400 dark:text-zinc-500 focus:!border-border dark:border-border focus:!shadow-none focus:!ring-0"
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
    enabled: true,
    students: isOsas ? [] : students,
    docTypes,
    showToast,
    onPromoted: onIngestPromoted,
    onOcrResult: (suggestion) => {
      if (!suggestion) return
      // OCR fills extracted fields; staff selects the student separately.
      const ocrDocType =
        suggestion.docType && String(suggestion.docType).trim()
          ? String(suggestion.docType).trim()
          : ""
      if (rescanContext || isReplaceMode || uploadStudentIsExisting) {
        setNewRec?.((p) => ({
          ...p,
          docType: rescanContext?.docType || p.docType || ocrDocType,
        }))
        return
      }
      if (suggestion.matchedStudent) {
        // Existing student matched: lock the form fields to their record.
        onSelectExistingStudent?.(suggestion.matchedStudent, ocrDocType)
      } else {
        // No match: only fill in the name/docType, leave form unlocked for manual entry.
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
    if (!uploadedFile && !hf.selectedRow) return

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
  }, [uploadedFile, hf.selectedRow, setDropActive])

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
      const timer = setTimeout(() => {
        setPdfPreviewDataUrl(null)
        setPdfRendering(false)
      }, 0)
      return () => {
        active = false
        clearTimeout(timer)
      }
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

  const handlePdfFileSelect = useCallback((files) => {
    if (!files) return
    hf.clearIngestSelection()
    onFileSelect(files)
  }, [hf, onFileSelect])

  const handleClearPdf = useCallback(() => {
    hf.clearIngestSelection()
    onClearFile()
  }, [hf, onClearFile])

  useEffect(() => {
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
        showToast({ title: "File Pasted", description: "Document pasted from clipboard." })
      }
    }

    window.addEventListener("paste", handleWindowPaste)
    return () => {
      window.removeEventListener("paste", handleWindowPaste)
    }
  }, [handlePdfFileSelect, showToast])

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
        showToast({ title: "File Pasted", description: "Document pasted from clipboard." })
      } else {
        showToast({ title: "Clipboard Empty", description: "No valid image or PDF found in clipboard." }, "warning")
      }
    } catch {
      showToast({ title: "Clipboard Access Limited", description: "Browser prevented automatic paste. Press Ctrl+V (or Cmd+V) to paste." }, "warning")
    }
  }


  return (
    <TooltipProvider delayDuration={200}>
      <div
        id="view-upload"
        className="font-jakarta w-full flex flex-[1_0_auto] flex-col h-auto focus:outline-none animate-fade-up"
      >
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
          <PageHeader
            icon="ph-scan"
            title="Scan & Upload"
            description={isOsas ? "Scan organization records or import files to save them digitally." : "Scan student records or import files to save them digitally."}
            showBorder={false}
            className="p-6"
            titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
            descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
            actions={
              <RefreshButton
                onRefresh={(e) => {
                  e?.stopPropagation?.()
                  hf.refresh()
                }}
                isLoading={hf.loading}
                title="Refresh Scanner Inbox"
              />
            }
          />

          {/* Workstation Hardware & Digitization Path Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2 bg-slate-50/70 dark:bg-zinc-900/60 border-t border-b border-border dark:border-border text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                
                <span className="text-[10px] font-bold text-gray-900 dark:text-zinc-300 uppercase tracking-wider">
                  Workstation:
                </span>
                <span className="font-semibold text-gray-800 dark:text-zinc-200">
                  {authUser?.station_name || `${(authUser?.office_id || "REG").toUpperCase()}-ARCHIVE-PC01`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-900 dark:text-zinc-300 uppercase tracking-wider">
                Digitization Save Path:
              </span>
              <span 
                className="text-[11px] font-medium text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-border dark:border-border px-2.5 py-0.5 rounded-lg truncate max-w-[340px]"
                title={authUser?.storage_path || `.local/storage/${authUser?.office_id || "registrar"}/uploads`}
              >
                {authUser?.storage_path || `.local/storage/${authUser?.office_id || "registrar"}/uploads`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-900 dark:text-zinc-300 uppercase tracking-wider">
                Scanner Inbound:
              </span>
              <span 
                className="text-[11px] font-medium text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-border dark:border-border px-2.5 py-0.5 rounded-lg truncate max-w-[340px]"
                title={authUser?.inbound_path || ".local/hot-folder/INBOUND"}
              >
                {authUser?.inbound_path || ".local/hot-folder/INBOUND"}
              </span>
            </div>
          </div>

          <ContinuousScanningPanel onOpenReview={onOpenBatchReview} showToast={showToast} />

          <CardContent className="flex flex-[1_0_auto] flex-col p-6 pt-3 rounded-b-2xl">
          {loading ? (
            <ScanUploadSkeleton />
          ) : error ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
              <Empty className="flex h-[320px] flex-col items-center justify-center border-0 text-center text-gray-900 dark:text-zinc-300">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none">
                    <HugeIcon  className="ph-duotone ph-warning-circle text-xl text-pup-maroon dark:text-primary" />
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

              <div className="flex flex-[1_0_auto] flex-col gap-6 h-auto lg:flex-row lg:items-stretch">
                <section className="relative flex h-auto min-h-[min(580px,50dvh)] flex-col transition-all duration-normal w-full lg:w-[48%]">
                  <div className="flex flex-col gap-4 w-full h-full">
                      <div
                        className={cn(
                          "group relative flex flex-1 min-h-[min(580px,50dvh)] w-full flex-col overflow-hidden rounded-2xl border transition-all duration-150 ease-out",
                          uploadedFile ? "bg-white border-border dark:bg-card dark:border-border" : "bg-gray-50/50 border-2 border-dashed border-border dark:bg-zinc-900/30 dark:border-border hover:border-pup-maroon/40 dark:hover:border-red-500/40",
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
                            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-white px-5 py-3 dark:border-border dark:bg-card">
                          <div className="min-w-0">
                            <div className="text-xs font-normal text-gray-900 dark:text-zinc-300">
                              {hf.selectedRow ? "Scanner Preview" : "Document Preview"}
                            </div>
                            <div className="truncate text-sm font-semibold text-pup-maroon dark:text-red-400">
                              {hf.selectedRow?.original_filename || uploadedFile?.name}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {(hf.ocrLoading || ocrLoading) && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 font-semibold text-[10px] tracking-wider animate-pulse dark:bg-amber-950/20 dark:border-amber-900/30">
                                <HugeIcon  className="ph-bold ph-spinner animate-spin" />
                                OCR Active
                              </div>
                            )}
                             {uploadedFiles && uploadedFiles.length > 1 && !hf.selectedRow && (
                               <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 onClick={() => setShowPagesSidebar(!showPagesSidebar)}
                                 className="h-8 px-3 text-xs font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95"
                               >
                                 {showPagesSidebar ? "Hide" : "Show"}
                               </Button>
                             )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              className="h-8 px-3 text-xs font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                              title="Choose or drop a different file"
                            >
                              <HugeIcon className="ph-bold ph-upload-simple text-xs" />
                              <span>Replace File</span>
                            </Button>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95"
                              onClick={() => setRotation((r) => r - 90)}
                              title="Rotate Left"
                            >
                              <HugeIcon  className="ph-bold ph-arrow-counter-clockwise text-xs" />
                            </button>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 shadow-xs transition-all hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95"
                              onClick={() => setRotation((r) => r + 90)}
                              title="Rotate Right"
                            >
                              <HugeIcon  className="ph-bold ph-arrow-clockwise text-xs" />
                            </button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="ml-1 h-8 px-3 text-xs font-semibold rounded-lg border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95"
                              onClick={() => {
                                if (hf.selectedRow) {
                                  hf.clearIngestSelection()
                                }
                                handleClearPdf()
                              }}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                        <div className="min-h-0 flex-1 flex overflow-hidden bg-gray-100 relative dark:bg-muted">
                          {uploadedFiles && uploadedFiles.length > 1 && !hf.selectedRow && showPagesSidebar && (
                            <div className="w-1/3 min-w-[200px] max-w-[280px] border-r border-border bg-white/95 backdrop-blur-md flex flex-col min-h-0 overflow-y-auto p-4 gap-3 dark:border-border dark:bg-card/95 shrink-0 z-10">
                              <div className="flex items-center justify-between pb-2 border-b border-border dark:border-border">
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
                                            <HugeIcon  className="ph-bold ph-caret-up text-xs" />
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
                                            <HugeIcon  className="ph-bold ph-caret-down text-xs" />
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
                                            <HugeIcon  className="ph-bold ph-trash text-xs" />
                                          </button>
                                        </div>
                                      </div>
                                      <span className="truncate text-[10px] text-gray-900 dark:text-zinc-300" title={file.name}>
                                        {file.name}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                title="Add Page"
                                className="mt-auto flex h-9 items-center justify-center rounded-xl border border-border bg-white text-xs font-semibold text-gray-700 shadow-xs transition-all hover:bg-gray-50 dark:bg-card dark:border-border dark:text-zinc-300 cursor-pointer active:scale-95 px-3"
                              >
                                Add
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
                                  <div className="h-10 w-10 animate-spin rounded-full border border-border border-t-pup-maroon mb-3 dark:border-border dark:border-t-red-500" />
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

                          {(windowDragActive || dropActive) && (
                            <div
                              className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-xs border-2 border-dashed border-white/80 rounded-2xl animate-fade-up"
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
                              <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-border shadow-xl max-w-xs text-center pointer-events-none animate-scale-up dark:bg-card dark:border-border">
                                <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-3 dark:bg-red-950/40 dark:border-red-900">
                                  <HugeIcon className="ph-bold ph-upload-simple text-2xl text-pup-maroon dark:text-red-400 animate-bounce" />
                                </div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                  Drop file here to replace preview
                                </p>
                                <p className="text-xs font-normal text-gray-500 mt-1.5 dark:text-zinc-400">
                                  Accepts PDF, JPG, PNG
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
                              <HugeIcon className={cn("ph-bold ph-upload-simple text-[32px] transition-colors duration-fast", dropActive ? "text-pup-maroon" : "text-gray-400 dark:text-zinc-500")} />
                              <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mt-3 m-0">
                                {isReplaceMode || rescanContext
                                  ? "Drop Replacement Document Or Image Here"
                                  : "Drop Document Or Image Here"}
                              </p>
                              <p className="text-xs font-normal text-gray-900 dark:text-zinc-300 mt-1 m-0">
                                or click to <span className="text-pup-maroon dark:text-red-400 font-medium cursor-pointer hover:underline">browse</span> local files (PDF, JPG, PNG)
                              </p>
                              {hf.rows.length > 0 ? (
                                <p className="mx-auto mt-4 max-w-xs text-[11px] font-medium text-gray-900 dark:text-zinc-300">
                                  This area accepts manual drops and clicks in addition to the scanner queue.
                                </p>
                              ) : null}
                            </div>

                            <div className="mt-8 flex flex-col items-center gap-1.5 select-none relative z-20" onClick={(e) => e.stopPropagation()}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handlePasteButtonClick}
                                className="h-9 px-4 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95"
                              >
                                Paste from Clipboard
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
                  {(ocrLoading || hf.ocrLoading) ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[16px] bg-white/95 backdrop-blur-sm dark:bg-card/90">
                      <div className="w-full max-w-xs px-6">
                        <div className="rounded-[16px] border border-[#E5E5EA] bg-white p-[26px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:border-border dark:bg-zinc-900 dark:shadow-none flex flex-col items-center justify-center">
                          <div className="h-[34px] w-[34px] rounded-full border-[2.5px] border-[#E5E5EA] border-t-pup-maroon dark:border-border dark:border-t-pup-maroon animate-spin mb-[12px]"></div>
                          <div className="text-center text-[13px] font-normal text-[#8E8E93] dark:text-zinc-400">
                            Processing scanned information...
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section className="font-jakarta flex h-fit flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-normal dark:border-border dark:bg-card dark:shadow-none w-full lg:w-[52%]">
                  <div className="flex items-start justify-between gap-4 border-b border-border bg-transparent p-5 dark:border-border">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-zinc-50 m-0">
                        {isOsas ? "Organization Document" : "Label Document"}
                      </h3>
                      <p className="text-xs text-gray-900 dark:text-zinc-300 m-0 leading-normal">
                        {uploadedFile
                          ? (isOsas ? "Review detected organization details and assign storage." : "Review scanned information and fill in missing fields.")
                          : (isOsas ? "Drop or select a file on the left, then associate an organization." : "Drop or select a file on the left, then fill in the form here.")}
                      </p>
                    </div>
                  </div>

                  {/* Rescan / Replacement Mode Banner (Attached edge-to-edge alert) */}
                  {(isReplaceMode || rescanContext || existingDocOnRecord) && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/90 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/25 px-5 py-2.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in transition-all select-none">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <HugeIcon className={cn(isReplaceMode || rescanContext ? "ph-bold ph-arrows-counter-clockwise text-[16px] text-amber-600 dark:text-amber-400 shrink-0" : "ph-bold ph-warning text-[16px] text-amber-600 dark:text-amber-400 shrink-0")} />
                        <div className="min-w-0">
                          <span className="font-semibold text-amber-950 dark:text-amber-100 mr-1.5">
                            {isReplaceMode || rescanContext ? "Rescan / Replacement Mode Active:" : "Existing Document On Record:"}
                          </span>
                          <span className="font-medium text-[11.5px] sm:text-xs leading-normal">
                            {isReplaceMode || rescanContext
                              ? `Submitting will update the on-file digital record for ${newRec.docType || "this document"} in-place and queue the new scan for administrative review.`
                              : `A digital copy of ${newRec.docType || "this document"} already exists for this ${isOsas ? "organization" : "student"}. Enable replacement mode to rescan and overwrite the copy on file.`}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
                        {rescanContext?.docId && onPreviewDocument && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onPreviewDocument(rescanContext.docType, newRec.name, rescanContext.targetId, rescanContext.docId)}
                            className="h-7 px-2.5 text-[11px] font-semibold text-amber-900 border-amber-300/80 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/40 rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="View current on-file version in modal"
                          >
                            <HugeIcon className="ph-bold ph-eye text-xs" />
                            <span>View Copy</span>
                          </Button>
                        )}
                        {isReplaceMode || rescanContext ? (
                          onCancelRescan && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={onCancelRescan}
                              className="h-7 px-2.5 text-[11px] font-semibold text-amber-900 border-amber-300/80 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/40 rounded-lg cursor-pointer shadow-2xs"
                            >
                              Cancel
                            </Button>
                          )
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsReplaceMode(true)}
                            className="h-7 px-3 text-[11px] font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-500 cursor-pointer shadow-2xs active:scale-95 transition-all"
                          >
                            Replace Document
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-5 bg-white dark:bg-transparent">
                      <div className="space-y-5">

                        {isOsas ? (
                          <div className="space-y-4">
                            {/* Segmented control: Recognized Organization vs Register New Organization */}
                            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-border/60 dark:border-border">
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadStudentIsExisting(true)
                                  clearAllUploadFieldErrors?.()
                                }}
                                className={cn(
                                  "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                                  uploadStudentIsExisting
                                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                                )}
                              >
                                Recognized Organization
                              </button>
                              <button
                                type="button"
                                disabled={Boolean(rescanContext)}
                                onClick={() => {
                                  if (rescanContext) return
                                  setUploadStudentIsExisting(false)
                                  clearAllUploadFieldErrors?.()
                                }}
                                className={cn(
                                  "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                                  !uploadStudentIsExisting
                                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                                )}
                              >
                                Register New Organization
                              </button>
                            </div>

                            {uploadStudentIsExisting ? (
                              /* Recognized Organization Selection */
                              <div className="space-y-4">
                                {newRec.organizationId && (
                                  <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 dark:border-emerald-500/20 dark:bg-emerald-950/20">
                                    <span className="inline-flex items-start gap-2 text-[11px] font-medium tracking-[0.04em] text-emerald-900 dark:text-emerald-400">
                                      <HugeIcon 
                                        className="ph-bold ph-check-circle mt-0.5 shrink-0"
                                        aria-hidden
                                      />
                                      <span>
                                        Recognized organization selected: profile details locked. Adjust storage location or document type if needed, then submit.
                                      </span>
                                    </span>
                                  </div>
                                )}

                                <div>
                                  <div className="mb-2 flex items-center justify-between">
                                    <label className="block text-xs font-medium text-gray-900 dark:text-zinc-300">
                                      Select Recognized Organization
                                    </label>
                                    {(newRec.organizationId || newRec.name || uploadedFile || hf.selected) && (
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
                                            organizationId: "",
                                            acronym: "",
                                            category: "",
                                            adviserName: "",
                                            adviserEmail: "",
                                          })
                                          setUploadStudentIsExisting(true)
                                          onCancelRescan?.()
                                          clearAllUploadFieldErrors?.()
                                          if (uploadedFile || hf.selected) {
                                            handleClearPdf()
                                          }
                                        }}
                                        className="h-6 rounded-lg px-2 text-xs font-semibold text-pup-maroon dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                      >
                                        Clear Selection
                                      </Button>
                                    )}
                                  </div>
                                  <Select
                                    placeholder="Choose an organization..."
                                    disabled={Boolean(rescanContext)}
                                    className={cn(
                                      "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-border dark:border-border text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
                                      ring("organization"),
                                      ring("organizationId"),
                                      Boolean(rescanContext) && lockedField
                                    )}
                                    value={newRec.organizationId || ""}
                                    onChange={(e) => {
                                      clearUploadFieldError?.("organization")
                                      clearUploadFieldError?.("organizationId")
                                      const targetOrg = organizations.find((o) => o.id === e.target.value)
                                      if (targetOrg) {
                                        onSelectExistingStudent?.(targetOrg, newRec.docType || null)
                                      }
                                    }}
                                  >
                                    <option value="">Choose an organization...</option>
                                    {organizations.map((org) => (
                                      <option key={org.id} value={org.id}>
                                        {org.acronym ? `[${org.acronym}] ` : ""}{org.name} ({org.category || "Organization"})
                                      </option>
                                    ))}
                                  </Select>
                                </div>

                                {newRec.organizationId && (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className={`mb-2 block text-xs font-medium ${lockedLabel} dark:text-zinc-400`}>
                                        Acronym
                                      </label>
                                      <Input
                                        type="text"
                                        className={cn(
                                          "h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs font-normal transition-all",
                                          lockedField
                                        )}
                                        value={newRec.acronym || "N/A"}
                                        disabled
                                      />
                                    </div>
                                    <div>
                                      <label className={`mb-2 block text-xs font-medium ${lockedLabel} dark:text-zinc-400`}>
                                        Category
                                      </label>
                                      <Input
                                        type="text"
                                        className={cn(
                                          "h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs font-normal transition-all",
                                          lockedField
                                        )}
                                        value={newRec.category || "N/A"}
                                        disabled
                                      />
                                    </div>
                                    {newRec.adviserName && (
                                      <div className="col-span-2">
                                        <label className={`mb-2 block text-xs font-medium ${lockedLabel} dark:text-zinc-400`}>
                                          Faculty Adviser
                                        </label>
                                        <Input
                                          type="text"
                                          className={cn(
                                            "h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs font-normal transition-all",
                                            lockedField
                                          )}
                                          value={newRec.adviserName}
                                          disabled
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* Register New Organization */
                              <div className="space-y-4">
                                <div>
                                  <div className="mb-2 flex items-center justify-between">
                                    <label className="block text-xs font-medium text-gray-900 dark:text-zinc-300">
                                      Organization Name
                                    </label>
                                    {(newRec.name || uploadedFile || hf.selected) && (
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
                                            organizationId: "",
                                            acronym: "",
                                            category: "",
                                            adviserName: "",
                                            adviserEmail: "",
                                          })
                                          clearAllUploadFieldErrors?.()
                                          if (uploadedFile || hf.selected) {
                                            handleClearPdf()
                                          }
                                        }}
                                        className="h-6 rounded-lg px-2 text-xs font-semibold text-pup-maroon dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                      >
                                        Clear Selection
                                      </Button>
                                    )}
                                  </div>
                                  <Input
                                    type="text"
                                    className={cn(
                                      "h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all",
                                      ring("name")
                                    )}
                                    placeholder="e.g. Junior Philippine Computer Society"
                                    value={newRec.name || ""}
                                    onChange={(e) => {
                                      clearUploadFieldError?.("name")
                                      setNewRec((p) => ({ ...p, name: e.target.value }))
                                    }}
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="mb-2 block text-xs font-medium text-gray-900 dark:text-zinc-300">
                                      Acronym
                                    </label>
                                    <Input
                                      type="text"
                                      className={cn(
                                        "h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all",
                                        ring("acronym")
                                      )}
                                      placeholder="e.g. JPCS"
                                      value={newRec.acronym || ""}
                                      onChange={(e) => {
                                        clearUploadFieldError?.("acronym")
                                        setNewRec((p) => ({ ...p, acronym: e.target.value.toUpperCase() }))
                                      }}
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-2 block text-xs font-medium text-gray-900 dark:text-zinc-300">
                                      Category
                                    </label>
                                    <Select
                                      placeholder="Select Category"
                                      className={cn(
                                        "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-border dark:border-border text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
                                        ring("category")
                                      )}
                                      value={newRec.category || ""}
                                      onChange={(e) => {
                                        clearUploadFieldError?.("category")
                                        const nextCategory = e.target.value
                                        setNewRec((p) => ({
                                          ...p,
                                          category: nextCategory,
                                          cabinet: nextCategory === "Academic" ? "ACADEMIC ORGANIZATIONS" : "NON-ACADEMIC ORGANIZATIONS",
                                        }))
                                      }}
                                    >
                                      <option value="">Select Category</option>
                                      <option value="Academic">Academic</option>
                                      <option value="Non-Academic">Non-Academic</option>
                                    </Select>
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-2 block text-xs font-medium text-gray-900 dark:text-zinc-300">
                                    Faculty Adviser
                                  </label>
                                  <Input
                                    type="text"
                                    className={cn(
                                      "h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all",
                                      ring("adviserName")
                                    )}
                                    placeholder="e.g. Prof. Juan Dela Cruz"
                                    value={newRec.adviserName || ""}
                                    onChange={(e) => {
                                      clearUploadFieldError?.("adviserName")
                                      setNewRec((p) => ({ ...p, adviserName: e.target.value }))
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Existing Student Record Form for Registrar */
                          <div className="space-y-5">
                            {uploadStudentIsExisting && (
                              <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 dark:border-emerald-500/20 dark:bg-emerald-950/20">
                                <span className="inline-flex items-start gap-2 text-[11px] font-medium tracking-[0.04em] text-emerald-900 dark:text-emerald-400">
                                  <HugeIcon 
                                    className="ph-bold ph-check-circle mt-0.5 shrink-0"
                                    aria-hidden
                                  />
                                  <span>
                                    Existing student: profile fields below are locked.
                                    Adjust room, cabinet, drawer, or document type if
                                    needed, then submit.
                                  </span>
                                </span>
                                {!rescanContext && (
                                  <button
                                    type="button"
                                    title="Switch to new student"
                                    className="shrink-0 text-left text-xs font-semibold text-pup-maroon dark:text-red-400 underline-offset-2 hover:underline cursor-pointer"
                                    onClick={() => {
                                      setUploadStudentIsExisting(false)
                                      onCancelRescan?.()
                                      clearAllUploadFieldErrors?.()
                                    }}
                                  >
                                    Switch
                                  </button>
                                )}
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
                                          organizationId: "",
                                          acronym: "",
                                          category: "",
                                          adviserName: "",
                                          adviserEmail: "",
                                        })
                                        setUploadStudentIsExisting(false)
                                        onCancelRescan?.()
                                        clearAllUploadFieldErrors?.()
                                        if (uploadedFile || hf.selected) {
                                          handleClearPdf()
                                        }
                                      }}
                                      className="h-6 rounded-lg px-2 text-xs font-semibold text-pup-maroon dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                    >
                                      Clear Form
                                    </Button>
                                  )}
                                </div>
                                <div className="relative">
                                  <Input
                                    type="text"
                                    className={cn(
                                      "h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all",
                                      ring("studentNo"),
                                      lockIdentity && lockedField
                                    )}
                                    placeholder="202X-XXXXX-SJ-0"
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
                                    <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-900 overflow-hidden shadow-xl p-1 animate-in fade-in slide-in-from-top-1 duration-fast">
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
                                            <div className="text-[10px] text-gray-900 dark:text-zinc-300">
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
                                      "h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs font-normal transition-all",
                                      lockedField
                                    )}
                                    value={newRec.name}
                                    disabled
                                  />
                                </div>
                              ) : (
                                <div>
                                  <label
                                    className="mb-2 block text-xs font-medium text-gray-900 dark:text-zinc-300"
                                  >
                                    Full Name (LN, FN MI.)
                                  </label>
                                  <div className="relative">
                                    <Input
                                      type="text"
                                      className={cn(
                                        "h-10 w-full rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all",
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
                                    {ocrSuggestion?.studentMatches?.length > 0 && !uploadStudentIsExisting && (
                                      <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-400/20 dark:bg-blue-950/20">
                                        <p className="mb-2 text-[11px] text-blue-800 dark:text-blue-200">
                                          OCR found possible roster matches within 10% letter difference. Select one to assign it.
                                        </p>
                                        <div className="space-y-1">
                                          {ocrSuggestion.studentMatches.map((candidate) => {
                                            const studentNo = candidate.studentNo || candidate.student_no;
                                            const student = candidate.student || students.find((item) => String(item.studentNo || item.student_no) === String(studentNo));
                                            if (!student) return null;
                                            return (
                                              <button
                                                key={studentNo}
                                                type="button"
                                                onClick={() => handleSelectStudent(student)}
                                                className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-white dark:hover:bg-zinc-900 cursor-pointer"
                                              >
                                                <span className="min-w-0">
                                                  <span className="block truncate font-semibold text-gray-900 dark:text-zinc-100">{student.name}</span>
                                                  <span className="text-[11px] text-gray-600 dark:text-zinc-400">{studentNo}</span>
                                                </span>
                                                <span className="shrink-0 text-[11px] text-gray-600 dark:text-zinc-400">{candidate.mismatchPercent}% difference</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                    {showNameSuggestions && filteredNameSuggestions.length > 0 && (
                                      <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-900 overflow-hidden shadow-xl p-1 animate-in fade-in slide-in-from-top-1 duration-fast">
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
                                              <div className="text-[10px] text-gray-900 dark:text-zinc-300">
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
                                  "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-border dark:border-border text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
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
                                  "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-border dark:border-border text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
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
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="mb-2 block text-xs font-medium text-gray-900 dark:text-zinc-300">
                              Room
                            </label>
                            <Select
                              placeholder=""
                              className={cn(
                                "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-border dark:border-border text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
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
                            <label className="mb-2 block text-xs font-medium text-gray-900 dark:text-zinc-300">
                              Cabinet
                            </label>
                            <Select
                              placeholder=""
                              className={cn(
                                "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-border dark:border-border text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
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
                            <label className="mb-2 block text-xs font-medium text-gray-900 dark:text-zinc-300">
                              Drawer
                            </label>
                            <Select
                              placeholder=""
                              className={cn(
                                "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-border dark:border-border text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
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

                        <div className="border-t border-border pt-5 dark:border-border">
                          <label className={`mb-2 block text-xs font-medium ${rescanContext?.docType ? lockedLabel : "text-gray-900 dark:text-zinc-300"}`}>
                            Document Type
                          </label>
                          <Select
                            placeholder="Select Document type"
                            disabled={Boolean(rescanContext?.docType)}
                            className={cn(
                              "h-10 rounded-xl px-3 bg-white dark:bg-zinc-800 border border-border dark:border-border text-xs shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800/80 transition-all",
                              ring("docType"),
                              Boolean(rescanContext?.docType) && lockedField
                            )}
                            value={newRec.docType}
                            onChange={(e) => {
                              clearUploadFieldError?.("docType")
                              const selectedDocType = e.target.value
                              setNewRec((p) => ({ ...p, docType: selectedDocType }))
                              const cleanId = String(
                                isOsas
                                  ? (newRec.organizationId || newRec.acronym || newRec.name || "")
                                  : (newRec.studentNo || "")
                              ).trim().toUpperCase()
                              if (cleanId && selectedDocType) {
                                checkDuplicate?.(cleanId, selectedDocType)
                              }
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
                        <div className="rounded-xl border border-border/80 bg-slate-50/60 p-3.5 dark:border-border dark:bg-white/5 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-zinc-200 text-xs">
                              <span>Digitization Destination</span>
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
                              Local Partition
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-900 dark:text-zinc-300 leading-normal">
                            Scanned document will be saved directly into this station&apos;s isolated directory:
                          </p>
                          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-border dark:border-border rounded-lg px-2.5 py-1.5 text-[11px] text-gray-700 dark:text-zinc-300 break-all">
                            <HugeIcon  className="ph-bold ph-folder-notch-open text-amber-600 dark:text-amber-400 shrink-0"></HugeIcon>
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
                          className={cn(
                            "w-full h-10 px-5 text-xs font-semibold rounded-xl active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs",
                            isReplaceMode || rescanContext
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900"
                          )}
                        >
                          {isReplaceMode || rescanContext ? "Replace Existing Document" : "Upload Document"}
                        </Button>
                      </div>
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
