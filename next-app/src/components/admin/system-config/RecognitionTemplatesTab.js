"use client"

import LucideIcon from "@/components/shared/LucideIcon";
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import ConfirmModal from "@/components/shared/ConfirmModal"
import RecognitionTemplateSkeleton from "@/components/admin/skeletons/RecognitionTemplateSkeleton"
import { detectDocType } from "@/lib/ocrClient"
import { cn } from "@/lib/utils"

const FIELDS = [
  ["firstName", "First name"],
  ["lastName", "Last name"],
  ["middleName", "Middle name"],
]
const WHOLE_FIELD = ["wholeName", "Whole name"]
const COLORS = { firstName: "#2563eb", middleName: "#9333ea", lastName: "#dc2626" }
const EMPTY_REGIONS = {
  mode: "",
  wholeName: { x: 0, y: 0, width: 0, height: 0 },
  firstName: { x: 0, y: 0, width: 0, height: 0 },
  middleName: { x: 0, y: 0, width: 0, height: 0 },
  lastName: { x: 0, y: 0, width: 0, height: 0 },
}

function clamp(value) {
  return Math.max(0, Math.min(1, value))
}

export default function RecognitionTemplatesTab({ showToast }) {
  const [docTypes, setDocTypes] = useState([])
  const [templates, setTemplates] = useState([])
  const [documentTypeId, setDocumentTypeId] = useState("")
  const [templateName, setTemplateName] = useState("PSA default")
  const [version, setVersion] = useState(1)
  const [pageIndex, setPageIndex] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [regions, setRegions] = useState(EMPTY_REGIONS)
  const [activeField, setActiveField] = useState("firstName")
  const [recognitionMode, setRecognitionMode] = useState("")
  const [sampleFile, setSampleFile] = useState(null)
  const [sampleUrl, setSampleUrl] = useState("")
  const [ocrPages, setOcrPages] = useState([])
  const [pageImage, setPageImage] = useState("")
  const [pageSize, setPageSize] = useState({ width: 1, height: 1 })
  const [dragStart, setDragStart] = useState(null)
  const [draftRegion, setDraftRegion] = useState(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [deleteTemplateId, setDeleteTemplateId] = useState(null)
  const [archiveTemplateId, setArchiveTemplateId] = useState(null)
  const [restoreTemplateId, setRestoreTemplateId] = useState(null)
  const [templateFilter, setTemplateFilter] = useState("Active")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const imageRef = useRef(null)
  const sampleInputRef = useRef(null)

  const load = async (showNotification = false) => {
    setLoading(true)
    try {
      const [typesResponse, templatesResponse] = await Promise.all([
        fetch("/api/doc-types?admin=true", { cache: "no-store" }),
        fetch("/api/recognition/templates?includeArchived=true", { cache: "no-store" }),
      ])
      const typesData = await typesResponse.json()
      const templatesData = await templatesResponse.json()
      setDocTypes(Array.isArray(typesData.data) ? typesData.data.filter((type) => type.status !== "Archived") : [])
      setTemplates(Array.isArray(templatesData.data) ? templatesData.data : [])
      if (showNotification) {
        showToast?.({ title: "Templates Refreshed", description: "Recognition templates have been updated." })
      }
    } catch (error) {
      showToast?.({ title: "Load failed", description: error.message }, true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => () => { if (sampleUrl) URL.revokeObjectURL(sampleUrl) }, [sampleUrl])

  const docTypeOptions = useMemo(() => [
    { value: "", label: "Select document type" },
    ...docTypes.map((type) => ({ value: String(type.id), label: type.name }))
  ], [docTypes])

  const pageOptions = useMemo(() => ocrPages.map((page) => ({
    value: String(page.pageIndex),
    label: `Page ${Number(page.pageIndex) + 1}`,
  })), [ocrPages])

  const activeTemplates = useMemo(() => templates.filter((t) => t.status !== "Archived"), [templates])
  const archivedTemplates = useMemo(() => templates.filter((t) => t.status === "Archived"), [templates])
  const displayTemplates = templateFilter === "Archived" ? archivedTemplates : activeTemplates

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId), [templates, selectedTemplateId])
  const currentPage = ocrPages.find((page) => Number(page.pageIndex) === Number(pageIndex))
  const previewRegion = draftRegion?.width > 0 && draftRegion?.height > 0 ? draftRegion : regions[activeField]
  const previewText = (currentPage?.observations || [])
    .filter((observation) => {
      const centerX = Number(observation.x || 0) + Number(observation.width || 0) / 2
      const centerY = Number(observation.y || 0) + Number(observation.height || 0) / 2
      return centerX >= previewRegion.x && centerX <= previewRegion.x + previewRegion.width
        && centerY >= previewRegion.y && centerY <= previewRegion.y + previewRegion.height
    })
    .sort((a, b) => (Number(a.y) - Number(b.y)) || (Number(a.x) - Number(b.x)))
    .map((observation) => String(observation.text || "").trim())
    .filter(Boolean)
    .join(" ")

  async function renderPage(file, nextPageIndex) {
    if (!file) return
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name || "")) {
      const pdfjs = await import("pdfjs-dist/build/pdf.mjs")
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs"
      const data = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data }).promise
      const page = await pdf.getPage(Number(nextPageIndex) + 1)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement("canvas")
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise
      setPageImage(canvas.toDataURL("image/png"))
      setPageSize({ width: viewport.width, height: viewport.height })
    } else {
      const url = URL.createObjectURL(file)
      setPageImage(url)
      const image = new Image()
      image.onload = () => setPageSize({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 })
      image.src = url
    }
  }

  async function handleSample(file) {
    if (!file) return
    if (sampleUrl) URL.revokeObjectURL(sampleUrl)
    setSampleFile(file)
    setSampleUrl(URL.createObjectURL(file))
    setPageIndex(0)
    setOcrPages([])
    setPageImage("")
    try {
      const form = new FormData()
      form.append("file", file)
      const response = await fetch("/api/ingest/ocr", { method: "POST", body: form })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || "OCR failed")
      setOcrPages(Array.isArray(data.pages) ? data.pages : [])
      const detectedDocumentType = detectDocType(data.text, docTypes.map((type) => type.name))
      const detectedType = docTypes.find((type) => type.name.toLowerCase() === detectedDocumentType.toLowerCase())
      if (detectedType) setDocumentTypeId(String(detectedType.id))
      await renderPage(file, 0)
      showToast?.({ title: "Sample loaded", description: detectedType ? `Document type detected: ${detectedType.name}. Choose a field, then draw its box.` : "Choose a field, then draw its box." })
    } catch (error) {
      showToast?.({ title: "Sample OCR failed", description: error.message }, true)
    }
  }

  function chooseSampleFile() {
    sampleInputRef.current?.click()
  }

  async function handlePageChange(value) {
    const next = Number(value)
    setPageIndex(next)
    await renderPage(sampleFile, next)
  }

  function pointerPosition(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) }
  }

  function startDraw(event) {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDragStart(pointerPosition(event))
    setDraftRegion({ ...pointerPosition(event), width: 0, height: 0 })
  }

  function updateDraw(event) {
    if (!dragStart) return
    const end = pointerPosition(event)
    setDraftRegion({
      x: Math.min(dragStart.x, end.x),
      y: Math.min(dragStart.y, end.y),
      width: Math.abs(end.x - dragStart.x),
      height: Math.abs(end.y - dragStart.y),
    })
  }

  function finishDraw(event) {
    if (!dragStart) return
    const end = pointerPosition(event)
    const x = Math.min(dragStart.x, end.x)
    const y = Math.min(dragStart.y, end.y)
    const next = { x, y, width: Math.abs(end.x - dragStart.x), height: Math.abs(end.y - dragStart.y) }
    if (next.width > 0.005 && next.height > 0.005) setRegions((previous) => ({ ...previous, [activeField]: next }))
    setDraftRegion(next)
    setDragStart(null)
  }

  function loadTemplate(template) {
    setSelectedTemplateId(template.id)
    setDocumentTypeId(String(template.document_type_id))
    setTemplateName(template.name)
    setVersion(Number(template.version) || 1)
    setPageIndex(Number(template.page_index) || 0)
    setRotation(Number(template.rotation) || 0)
    const nextRegions = template.regions || EMPTY_REGIONS
    const nextMode = nextRegions.mode || (nextRegions.wholeName?.width > 0 && nextRegions.wholeName?.height > 0 ? "whole" : "separate")
    setRecognitionMode(nextMode)
    setActiveField(nextMode === "whole" ? "wholeName" : "firstName")
    setRegions(nextRegions)
    setDraftRegion(null)
  }

  async function saveTemplate() {
    if (!documentTypeId || (!selectedTemplateId && !sampleFile)) {
      return showToast?.({
        title: "Missing information",
        description: "Select a document type and load a representative PSA sample first.",
      }, true)
    }
    const requiredFields = recognitionMode === "whole" ? [WHOLE_FIELD] : FIELDS
    if (!recognitionMode || !requiredFields.every(([key]) => regions[key]?.width > 0 && regions[key]?.height > 0)) {
      return showToast?.({
        title: "Plot required name fields",
        description: recognitionMode === "whole" ? "Draw a rectangle around the complete name." : "Draw rectangles for first, middle, and last name.",
      }, true)
    }
    setSaving(true)
    try {
      const payload = {
        documentTypeId,
        name: templateName,
        version: selectedTemplateId ? Number(version) + 1 : Number(version),
        pageIndex,
        rotation,
        regions: { ...regions, mode: recognitionMode },
      }
      const response = await fetch("/api/recognition/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || "Save failed")
      showToast?.({
        title: "OCR configuration saved",
        description: "This configuration was saved as a separate version.",
      })
      await load()
      setSelectedTemplateId(data.data?.id || selectedTemplateId)
    } catch (error) {
      showToast?.({ title: "Save failed", description: error.message }, true)
    } finally {
      setSaving(false)
    }
  }

  async function confirmArchiveTemplate() {
    if (!archiveTemplateId) return
    try {
      const response = await fetch(`/api/recognition/templates/${archiveTemplateId}`, { method: "DELETE" })
      const data = await response.json()
      if (response.ok && data.ok) {
        await load()
        if (selectedTemplateId === archiveTemplateId) setSelectedTemplateId(null)
        setArchiveTemplateId(null)
        showToast?.({ title: "Template archived", description: "The template configuration has been archived." })
      } else {
        showToast?.({ title: "Archive failed", description: data.error || "Unable to archive template." }, true)
      }
    } catch (err) {
      showToast?.({ title: "Archive failed", description: err.message }, true)
    }
  }

  async function confirmRestoreTemplate() {
    if (!restoreTemplateId) return
    try {
      const response = await fetch(`/api/recognition/templates/${restoreTemplateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Active" }),
      })
      const data = await response.json()
      if (response.ok && data.ok) {
        await load()
        setRestoreTemplateId(null)
        showToast?.({ title: "Template restored", description: "The template configuration has been re-activated." })
      } else {
        showToast?.({ title: "Restore failed", description: data.error || "Unable to restore template." }, true)
      }
    } catch (err) {
      showToast?.({ title: "Restore failed", description: err.message }, true)
    }
  }

  async function deleteTemplate() {
    if (!deleteTemplateId) return
    try {
      const response = await fetch(`/api/recognition/templates/${deleteTemplateId}?permanent=true`, { method: "DELETE" })
      const data = await response.json()
      if (response.ok && data.ok) {
        await load()
        if (selectedTemplateId === deleteTemplateId) setSelectedTemplateId(null)
        setDeleteTemplateId(null)
        showToast?.({ title: "OCR configuration deleted", description: "The saved configuration was permanently removed." })
      } else {
        showToast?.({ title: "Delete failed", description: data.error || "Unable to delete configuration." }, true)
      }
    } catch (err) {
      showToast?.({ title: "Delete failed", description: err.message }, true)
    }
  }

  if (loading) {
    return <RecognitionTemplateSkeleton />
  }

  return (
    <TooltipProvider delay={200}>
      <div className="space-y-6 p-7 select-none animate-fade-up">
        <PageHeader
          showBorder={false}
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          title="OCR Configuration"
          description="Select a document type, upload a representative sample, and calibrate field bounding boxes for automated OCR extraction."
          className="p-0"
          actions={
            <RefreshButton
              onRefresh={() => load(true)}
              isLoading={loading}
              title="Refresh Templates"
            />
          }
        />

        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
          {/* Left Panel: Calibration Controls */}
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-card shadow-xs">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Template Controls
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                Document Type
              </label>
              <Select
                options={docTypeOptions}
                value={documentTypeId}
                onValueChange={(val) => setDocumentTypeId(val)}
                placeholder="Select document type"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                Calibration Document
              </label>
              <input
                ref={sampleInputRef}
                type="file"
                accept="application/pdf,image/*"
                onChange={(event) => handleSample(event.target.files?.[0])}
                className="sr-only"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 text-xs font-semibold active:scale-95 transition-all shadow-xs cursor-pointer"
                onClick={chooseSampleFile}
              >
                {sampleFile ? "Replace Sample File" : "Upload Sample File"}
              </Button>
              {sampleFile ? (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <LucideIcon  className="ph-bold ph-file-text text-sm text-pup-maroon dark:text-red-400 flex-shrink-0" />
                    <span className="truncate text-xs font-medium text-gray-700 dark:text-zinc-300">
                      {sampleFile.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 flex-shrink-0">
                    {(sampleFile.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                  Upload a representative PDF or image before highlighting fields.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                  Fields to OCR
                </label>
                {recognitionMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecognitionMode("")
                      setActiveField("firstName")
                      setRegions(EMPTY_REGIONS)
                      setDraftRegion(null)
                    }}
                    className="text-[11px] text-gray-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer border-0 bg-transparent p-0 transition-colors"
                  >
                    Reset Mode
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                Choose a recognition method, then draw its bounding box.
              </p>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {[WHOLE_FIELD, ...FIELDS].map(([key, label]) => {
                  const plotted = regions[key]?.width > 0 && regions[key]?.height > 0
                  const fieldMode = key === "wholeName" ? "whole" : "separate"
                  const disabled = Boolean(recognitionMode && recognitionMode !== fieldMode)
                  const isSelected = activeField === key
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (!recognitionMode) setRecognitionMode(fieldMode)
                        setActiveField(key)
                        setDraftRegion(null)
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                        isSelected
                          ? "border-pup-maroon bg-pup-maroon/5 text-pup-maroon dark:border-red-500/80 dark:bg-red-500/10 dark:text-red-300 ring-1 ring-pup-maroon dark:ring-red-500/80"
                          : "border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800/80 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60",
                        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: key === "wholeName" ? "#800000" : COLORS[key] }}
                        />
                        <span>{label}</span>
                      </div>
                      {plotted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                          <LucideIcon  className="ph-bold ph-check text-[10px]" /> Plotted
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-normal text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800">
                          Not set
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-zinc-800/40 p-3 text-xs text-gray-600 dark:text-zinc-300">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Active Field Target
              </div>
              <div className="mt-0.5 font-semibold text-gray-900 dark:text-zinc-50">
                {[WHOLE_FIELD, ...FIELDS].find(([key]) => key === activeField)?.[1] || "Choose a recognition method"}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-white/5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                Template Name
              </label>
              <Input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="Template name"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                Version
              </label>
              <Input
                type="number"
                min="1"
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            {ocrPages.length > 1 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300">
                  Page Index
                </label>
                <Select
                  options={pageOptions}
                  value={String(pageIndex)}
                  onValueChange={(val) => handlePageChange(val)}
                  className="h-10 rounded-xl"
                />
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 dark:border-white/5">
              <Button
                className="w-full h-10 rounded-xl btn-brand-red text-white text-xs font-semibold shadow-xs cursor-pointer active:scale-95 transition-all border-0"
                onClick={saveTemplate}
                disabled={saving || loading}
              >
                {saving ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>

          {/* Center Panel: Visual Calibration Canvas */}
          <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-card shadow-xs flex flex-col justify-between min-h-[560px]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10 text-xs text-gray-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <LucideIcon  className="ph-bold ph-cursor-click text-sm text-pup-maroon dark:text-red-400" />
                <span>Drag across the printed value area to calibrate field coordinates.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-mono text-gray-600 dark:text-zinc-300">
                  Scale: 0.00 – 1.00
                </span>
                {draftRegion && (
                  <button
                    type="button"
                    onClick={() => setDraftRegion(null)}
                    className="text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer border-0 bg-transparent p-0 transition-colors"
                  >
                    Clear Draft
                  </button>
                )}
              </div>
            </div>

            {pageImage ? (
              <div className="py-4 my-auto overflow-auto max-h-[640px] flex items-center justify-center">
                <div className="mx-auto w-full max-w-2xl" style={{ aspectRatio: `${pageSize.width} / ${pageSize.height}` }}>
                  <div
                    ref={imageRef}
                    className="relative h-full w-full select-none overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white shadow-sm"
                    onPointerDown={startDraw}
                    onPointerMove={updateDraw}
                    onPointerUp={finishDraw}
                    onPointerCancel={() => {
                      setDragStart(null)
                      setDraftRegion(null)
                    }}
                  >
                    <img
                      src={pageImage}
                      alt="PSA calibration sample"
                      className="absolute inset-0 h-full w-full object-contain"
                      draggable="false"
                    />
                    {(currentPage?.observations || []).map((observation, index) => (
                      <div
                        key={`${observation.text}-${index}`}
                        className="pointer-events-none absolute border border-emerald-500/70 bg-emerald-400/10"
                        style={{
                          left: `${observation.x * 100}%`,
                          top: `${observation.y * 100}%`,
                          width: `${observation.width * 100}%`,
                          height: `${observation.height * 100}%`,
                        }}
                      />
                    ))}
                    {(recognitionMode === "whole" ? [WHOLE_FIELD] : recognitionMode === "separate" ? FIELDS : []).map(([key, label]) => {
                      const region = key === activeField && draftRegion?.width > 0 && draftRegion?.height > 0 ? draftRegion : regions[key]
                      const labelAbove = region.y > 0.08
                      const color = key === "wholeName" ? "#800000" : COLORS[key]
                      return region.width > 0 && region.height > 0 ? (
                        <div
                          key={key}
                          className="pointer-events-none absolute border-2"
                          style={{
                            left: `${region.x * 100}%`,
                            top: `${region.y * 100}%`,
                            width: `${region.width * 100}%`,
                            height: `${region.height * 100}%`,
                            borderColor: color,
                          }}
                        >
                          <span
                            className={`absolute left-0 z-20 whitespace-nowrap rounded px-1 text-[10px] font-semibold shadow-xs ${
                              labelAbove ? "-top-5" : "top-full mt-1"
                            }`}
                            style={{ backgroundColor: color, color: "#ffffff" }}
                          >
                            {label}
                          </span>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <Empty className="flex h-[520px] flex-col items-center justify-center border-0 bg-transparent text-center">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <div className="relative mb-5">
                    <div className="absolute inset-0 rounded-3xl bg-linear-to-tr from-pup-maroon/20 to-amber-500/20 blur-xl dark:from-pup-maroon/30 dark:to-amber-500/30" />
                    <EmptyMedia className="relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-gray-100 bg-white shadow-xl rotate-3 dark:border-white/10 dark:bg-card dark:shadow-none">
                      <LucideIcon  className="ph-duotone ph-file-arrow-up text-4xl text-pup-maroon dark:text-red-400" />
                    </EmptyMedia>
                  </div>
                  <EmptyTitle className="text-lg font-semibold text-gray-900 dark:text-zinc-50">
                    No Sample Document Loaded
                  </EmptyTitle>
                  <EmptyDescription className="mt-1 max-w-sm text-xs font-normal text-gray-500 dark:text-zinc-400">
                    Load a representative PSA PDF or image to visualize text boundaries and calibrate coordinate extraction boxes.
                  </EmptyDescription>
                  <div className="mt-5 flex flex-col items-center gap-2">
                    <Button
                      type="button"
                      className="h-10 px-5 text-xs font-semibold rounded-xl btn-brand-red text-white shadow-xs active:scale-95 transition-all cursor-pointer border-0"
                      onClick={chooseSampleFile}
                    >
                      Upload Sample
                    </Button>
                    {!documentTypeId && (
                      <span className="text-[11px] text-gray-400 dark:text-zinc-500">
                        Tip: Select the target document type in the sidebar before saving.
                      </span>
                    )}
                  </div>
                </EmptyHeader>
              </Empty>
            )}

            {pageImage && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px] items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Live Field Extraction Check</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-pup-maroon/10 text-pup-maroon dark:bg-red-500/20 dark:text-red-300">
                      {[WHOLE_FIELD, ...FIELDS].find(([key]) => key === activeField)?.[1] || "Field"}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-gray-600 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-gray-100 dark:border-white/5 truncate">
                    {previewText ? `"${previewText}"` : "No OCR text detected inside this bounding box yet."}
                  </p>
                </div>
                {previewRegion.width > 0 && previewRegion.height > 0 ? (
                  <div className="relative h-18 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-zinc-900">
                    <img
                      src={pageImage}
                      alt="Selected OCR region"
                      className="absolute max-w-none"
                      style={{
                        left: `${-(previewRegion.x / previewRegion.width) * 100}%`,
                        top: `${-(previewRegion.y / previewRegion.height) * 100}%`,
                        width: `${(1 / previewRegion.width) * 100}%`,
                        height: `${(1 / previewRegion.height) * 100}%`,
                      }}
                      draggable="false"
                    />
                  </div>
                ) : (
                  <div className="flex h-18 items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-zinc-800 text-[11px] text-gray-400">
                    Draw bounding box
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel: Saved Templates */}
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/10 dark:bg-card shadow-xs">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Saved Templates
              </div>
            </div>

            {/* Active / Archived Segmented Switch */}
            <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-gray-200/60 dark:border-white/5">
              <button
                type="button"
                onClick={() => setTemplateFilter("Active")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border-0",
                  templateFilter === "Active"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-transparent"
                )}
              >
                Active ({activeTemplates.length})
              </button>
              <button
                type="button"
                onClick={() => setTemplateFilter("Archived")}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border-0",
                  templateFilter === "Archived"
                    ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white bg-transparent"
                )}
              >
                Archived ({archivedTemplates.length})
              </button>
            </div>

            {displayTemplates.length === 0 ? (
              <Empty className="py-12 flex flex-col items-center justify-center text-center border-0 bg-transparent">
                <EmptyHeader className="flex flex-col items-center gap-0">
                  <EmptyMedia className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-zinc-800">
                    <LucideIcon  className="ph-duotone ph-bounding-box text-2xl text-gray-400 dark:text-zinc-500" />
                  </EmptyMedia>
                  <EmptyTitle className="text-xs font-semibold text-gray-900 dark:text-zinc-50">
                    {templateFilter === "Archived" ? "No Archived Templates" : "No Templates Saved"}
                  </EmptyTitle>
                  <EmptyDescription className="mt-0.5 text-[11px] text-gray-400 dark:text-zinc-500 max-w-[200px]">
                    {templateFilter === "Archived"
                      ? "No templates are currently archived."
                      : "Calibrate and save field coordinates to create your first template."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {displayTemplates.map((template) => {
                  const isSelected = selectedTemplateId === template.id
                  return (
                    <div
                      key={template.id}
                      className={cn(
                        "relative rounded-xl border p-3.5 transition-all group",
                        isSelected
                          ? "border-pup-maroon bg-pup-maroon/5 dark:border-red-500/80 dark:bg-red-500/10 shadow-xs"
                          : "border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800/40 hover:border-gray-300 dark:hover:border-zinc-700"
                      )}
                    >
                      {/* Action buttons with Tooltips */}
                      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
                        {template.status === "Active" ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label={`Archive ${template.name}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setArchiveTemplateId(template.id)
                                }}
                                className="w-7 h-7 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors flex items-center justify-center cursor-pointer active:scale-95 border-0 bg-transparent"
                              >
                                <LucideIcon  className="ph-bold ph-archive text-sm" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Archive template</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label={`Restore ${template.name}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRestoreTemplateId(template.id)
                                }}
                                className="w-7 h-7 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors flex items-center justify-center cursor-pointer active:scale-95 border-0 bg-transparent"
                              >
                                <LucideIcon  className="ph-bold ph-arrow-counter-clockwise text-sm" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Restore template</TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Delete ${template.name}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteTemplateId(template.id)
                              }}
                              className="w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center cursor-pointer active:scale-95 border-0 bg-transparent"
                            >
                              <LucideIcon  className="ph-bold ph-trash text-sm" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Delete permanently</TooltipContent>
                        </Tooltip>
                      </div>

                      <button
                        type="button"
                        className="block w-full pr-16 text-left cursor-pointer border-0 bg-transparent p-0"
                        onClick={() => loadTemplate(template)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-gray-900 dark:text-zinc-50 truncate">
                            {template.document_type}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                            v{template.version}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                          {template.name}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400 dark:text-zinc-500">
                          <span>Page {Number(template.page_index) + 1}</span>
                          <span>·</span>
                          <span>{template.regions?.mode === "whole" ? "Single Box" : "Separate Fields"}</span>
                          {template.status === "Archived" && (
                            <>
                              <span>·</span>
                              <span className="text-amber-600 dark:text-amber-400 font-medium">Archived</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="rounded-xl bg-gray-50 dark:bg-zinc-800/50 p-3 text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed border border-gray-100 dark:border-white/5">
              <span className="font-semibold text-gray-700 dark:text-zinc-300">Legend:</span> Green boxes represent raw OCR observations. Colored boxes reflect calibrated field regions.
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={Boolean(deleteTemplateId)}
          title="Delete OCR Configuration"
          message="This permanently deletes the saved OCR configuration. This action cannot be undone."
          confirmLabel="Delete"
          confirmVariant="danger"
          onCancel={() => setDeleteTemplateId(null)}
          onConfirm={deleteTemplate}
        />

        {/* Archive Confirmation Modal */}
        <ConfirmModal
          open={Boolean(archiveTemplateId)}
          title="Archive OCR Configuration"
          message="Archiving this configuration will remove it from active recognition routing. You can restore it anytime from the Archived tab."
          confirmLabel="Archive"
          confirmVariant="warning"
          isArchiveModal={true}
          onCancel={() => setArchiveTemplateId(null)}
          onConfirm={confirmArchiveTemplate}
        />

        {/* Restore Confirmation Modal */}
        <ConfirmModal
          open={Boolean(restoreTemplateId)}
          title="Restore OCR Configuration"
          message="Restoring this template configuration will re-activate it for automated OCR document processing."
          confirmLabel="Restore"
          confirmVariant="success"
          isRestoreModal={true}
          onCancel={() => setRestoreTemplateId(null)}
          onConfirm={confirmRestoreTemplate}
        />
      </div>
    </TooltipProvider>
  )
}
