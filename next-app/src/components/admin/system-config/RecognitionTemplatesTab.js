"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { detectDocType } from "@/lib/ocrClient"
import ConfirmModal from "@/components/shared/ConfirmModal"

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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const imageRef = useRef(null)
  const sampleInputRef = useRef(null)

  const load = async () => {
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
    } catch (error) {
      showToast?.({ title: "Load failed", description: error.message }, true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => () => { if (sampleUrl) URL.revokeObjectURL(sampleUrl) }, [sampleUrl])

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
    if (!documentTypeId || (!selectedTemplateId && !sampleFile)) return showToast?.({ title: "Missing information", description: "Select a document type and load a representative PSA sample first." }, true)
    const requiredFields = recognitionMode === "whole" ? [WHOLE_FIELD] : FIELDS
    if (!recognitionMode || !requiredFields.every(([key]) => regions[key]?.width > 0 && regions[key]?.height > 0)) return showToast?.({ title: "Plot the selected name field", description: recognitionMode === "whole" ? "Draw one rectangle around the complete name." : "Draw rectangles for first, middle, and last name." }, true)
    setSaving(true)
    try {
      const payload = { documentTypeId, name: templateName, version: selectedTemplateId ? Number(version) + 1 : Number(version), pageIndex, rotation, regions: { ...regions, mode: recognitionMode } }
      const response = await fetch("/api/recognition/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || "Save failed")
      showToast?.({ title: "OCR configuration saved", description: "This configuration was saved as a separate version." })
      await load()
      setSelectedTemplateId(data.data?.id || selectedTemplateId)
    } catch (error) {
      showToast?.({ title: "Save failed", description: error.message }, true)
    } finally {
      setSaving(false)
    }
  }

  async function archiveTemplate(id) {
    const response = await fetch(`/api/recognition/templates/${id}`, { method: "DELETE" })
    const data = await response.json()
    if (response.ok && data.ok) { await load(); if (selectedTemplateId === id) setSelectedTemplateId(null) }
    else showToast?.({ title: "Archive failed", description: data.error || "Unable to archive template." }, true)
  }

  async function deleteTemplate() {
    if (!deleteTemplateId) return
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
  }

  return (
    <div className="space-y-5 p-7">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">OCR Configuration</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Select a document type, choose a name field, load a PSA file, and drag over that field. Repeat for each field, then save the template.</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <div className="space-y-4 rounded-brand border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
          <label className="block text-xs font-semibold uppercase text-gray-500">Document type</label>
          <Select containerClassName="h-auto" value={documentTypeId} onChange={(event) => setDocumentTypeId(event.target.value)}>
            <option value="">Select document type</option>
            {docTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </Select>
          <label className="block text-xs font-semibold uppercase text-gray-500">Document</label>
          <input ref={sampleInputRef} type="file" accept="application/pdf,image/*" onChange={(event) => handleSample(event.target.files?.[0])} className="sr-only" />
          <Button type="button" variant="outline" className="w-full justify-center border-pup-maroon text-pup-maroon" onClick={chooseSampleFile}>
            <i className="ph-bold ph-upload-simple mr-2" />
            {sampleFile ? "Replace document" : "Upload document"}
          </Button>
          {sampleFile ? <p className="truncate text-xs text-gray-500">Uploaded: {sampleFile.name}</p> : <p className="text-xs text-gray-500">Upload a representative document before highlighting fields.</p>}
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-500">Fields to OCR</label>
            <p className="mt-1 text-xs text-gray-500">Choose one recognition method, then draw its highlight box.</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[WHOLE_FIELD, ...FIELDS].map(([key, label]) => {
              const plotted = regions[key]?.width > 0 && regions[key]?.height > 0
              const fieldMode = key === "wholeName" ? "whole" : "separate"
              const disabled = Boolean(recognitionMode && recognitionMode !== fieldMode)
              return <Button key={key} type="button" variant={activeField === key ? "default" : "outline"} disabled={disabled} onClick={() => { if (!recognitionMode) setRecognitionMode(fieldMode); setActiveField(key); setDraftRegion(null) }} className={`justify-between ${disabled ? "cursor-not-allowed opacity-40" : ""}`} style={activeField === key ? { backgroundColor: key === "wholeName" ? "#800000" : COLORS[key] } : undefined}>
                <span>{label}</span>
                <span className="text-xs font-normal">{plotted ? "Set" : "Not set"}</span>
              </Button>
            })}
          </div>
          {recognitionMode && <Button type="button" variant="ghost" className="w-full text-xs text-gray-500" onClick={() => { setRecognitionMode(""); setActiveField("firstName"); setRegions(EMPTY_REGIONS); setDraftRegion(null) }}>Change recognition method</Button>}
          <div className="rounded border border-gray-200 bg-white p-3 text-xs text-gray-600">
            <span className="font-semibold text-gray-900">Selected field:</span> {[WHOLE_FIELD, ...FIELDS].find(([key]) => key === activeField)?.[1] || "Choose a recognition method"}
          </div>
          <div className="border-t border-gray-200 pt-4">
            <Button className="w-full bg-pup-maroon text-white" onClick={saveTemplate} disabled={saving || loading}>{saving ? "Saving..." : "Save template"}</Button>
          </div>
          <label className="block text-xs font-semibold uppercase text-gray-500">Template name</label>
          <input className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm" value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
          <label className="block text-xs font-semibold uppercase text-gray-500">Version</label>
          <input type="number" min="1" className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm" value={version} onChange={(event) => setVersion(event.target.value)} />
          {ocrPages.length > 1 && <><label className="block text-xs font-semibold uppercase text-gray-500">Page</label><Select containerClassName="h-auto" value={pageIndex} onChange={(event) => handlePageChange(event.target.value)}>{ocrPages.map((page) => <option key={page.pageIndex} value={page.pageIndex}>Page {Number(page.pageIndex) + 1}</option>)}</Select></>}
        </div>

        <div className="min-w-0 rounded-brand border border-gray-200 bg-gray-100 p-4 dark:border-white/10 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between text-xs text-gray-500"><span>Drag over the printed value area for the selected field.</span><span>Coordinates: 0–1</span></div>
          {pageImage ? <div className="mx-auto w-full max-w-3xl" style={{ aspectRatio: `${pageSize.width} / ${pageSize.height}` }}>
              <div ref={imageRef} className="relative h-full w-full select-none overflow-hidden bg-white shadow" onPointerDown={startDraw} onPointerMove={updateDraw} onPointerUp={finishDraw} onPointerCancel={() => { setDragStart(null); setDraftRegion(null) }}>
              <img src={pageImage} alt="PSA calibration sample" className="absolute inset-0 h-full w-full object-contain" draggable="false" />
              {(currentPage?.observations || []).map((observation, index) => <div key={`${observation.text}-${index}`} className="pointer-events-none absolute border border-emerald-500/70 bg-emerald-400/10" style={{ left: `${observation.x * 100}%`, top: `${observation.y * 100}%`, width: `${observation.width * 100}%`, height: `${observation.height * 100}%` }} />)}
              {(recognitionMode === "whole" ? [WHOLE_FIELD] : recognitionMode === "separate" ? FIELDS : []).map(([key, label]) => { const region = key === activeField && draftRegion?.width > 0 && draftRegion?.height > 0 ? draftRegion : regions[key]; const labelAbove = region.y > 0.08; const color = key === "wholeName" ? "#800000" : COLORS[key]; return region.width > 0 && region.height > 0 ? <div key={key} className="pointer-events-none absolute border-2" style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%`, borderColor: color }}><span className={`absolute left-0 z-20 whitespace-nowrap bg-white px-1 text-[10px] font-semibold shadow-sm ${labelAbove ? "-top-5" : "top-full mt-1"}`} style={{ color }}>{label}</span></div> : null })}
            </div>
          </div> : <div className="flex h-[520px] flex-col items-center justify-center gap-3 text-center text-sm text-gray-500">
            <i className="ph-duotone ph-file-arrow-up text-4xl text-pup-maroon" />
            <p>Load a representative PSA PDF or image to begin plotting.</p>
            <Button type="button" className="bg-pup-maroon text-white" onClick={chooseSampleFile}>
              <i className="ph-bold ph-upload-simple mr-2" />
              Load PSA file
            </Button>
            {!documentTypeId && <p className="text-xs text-gray-400">You can load the file now; select the document type before saving.</p>}
          </div>}
          {pageImage && <div className="mt-4 grid gap-3 rounded-brand border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-card sm:grid-cols-[minmax(0,1fr)_180px]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Live field check</div>
            <p className="mt-1 text-xs text-gray-500">{[WHOLE_FIELD, ...FIELDS].find(([key]) => key === activeField)?.[1] || "Selected field"}: {previewText || "No OCR text detected inside this box yet."}</p>
            </div>
            {previewRegion.width > 0 && previewRegion.height > 0 ? <div className="relative h-24 overflow-hidden rounded border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-zinc-900">
              <img src={pageImage} alt="Selected OCR region" className="absolute max-w-none" style={{ left: `${-(previewRegion.x / previewRegion.width) * 100}%`, top: `${-(previewRegion.y / previewRegion.height) * 100}%`, width: `${(1 / previewRegion.width) * 100}%`, height: `${(1 / previewRegion.height) * 100}%` }} draggable="false" />
            </div> : <div className="flex h-24 items-center justify-center rounded border border-dashed border-gray-300 text-[11px] text-gray-400">Draw a field box</div>}
          </div>}
        </div>

        <div className="space-y-3 rounded-brand border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-card">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Saved templates</div>
          {templates.length === 0 ? <p className="text-sm text-gray-500">No templates saved.</p> : templates.map((template) => <div key={template.id} className={`relative rounded border p-3 ${selectedTemplateId === template.id ? "border-pup-maroon" : "border-gray-200"}`}><button type="button" aria-label={`Delete ${template.name}`} title="Delete permanently" onClick={() => setDeleteTemplateId(template.id)} className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-700"><i className="ph-bold ph-trash" /></button><button type="button" className="block w-full pr-8 text-left" onClick={() => loadTemplate(template)}><div className="text-sm font-semibold">{template.document_type}</div><div className="text-xs text-gray-500">{template.name} · v{template.version} · page {Number(template.page_index) + 1}</div><div className="mt-1 text-xs text-gray-400">{template.status}</div></button>{template.status === "Active" && <button type="button" onClick={() => archiveTemplate(template.id)} className="mt-2 text-xs font-semibold text-red-700">Archive</button>}</div>)}
          <div className="rounded bg-gray-50 p-3 text-xs text-gray-500">Green boxes are OCR observations. Colored boxes are saved field regions. Use the actual displayed page bounds when plotting.</div>
        </div>
      </div>
      <ConfirmModal
        open={Boolean(deleteTemplateId)}
        title="Delete OCR configuration"
        message="This permanently deletes the saved OCR configuration. This action cannot be undone."
        confirmLabel="Delete permanently"
        onCancel={() => setDeleteTemplateId(null)}
        onConfirm={deleteTemplate}
      />
    </div>
  )
}
