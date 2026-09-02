"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"

const FIELDS = [
  ["firstName", "First name"],
  ["middleName", "Middle name"],
  ["lastName", "Last name"],
]
const COLORS = { firstName: "#2563eb", middleName: "#9333ea", lastName: "#dc2626" }
const EMPTY_REGIONS = {
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
  const [sampleFile, setSampleFile] = useState(null)
  const [sampleUrl, setSampleUrl] = useState("")
  const [ocrPages, setOcrPages] = useState([])
  const [pageImage, setPageImage] = useState("")
  const [pageSize, setPageSize] = useState({ width: 1, height: 1 })
  const [dragStart, setDragStart] = useState(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const imageRef = useRef(null)

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
      await renderPage(file, 0)
      showToast?.({ title: "Sample loaded", description: "Draw the three name-field rectangles on the page." })
    } catch (error) {
      showToast?.({ title: "Sample OCR failed", description: error.message }, true)
    }
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
  }

  function finishDraw(event) {
    if (!dragStart) return
    const end = pointerPosition(event)
    const x = Math.min(dragStart.x, end.x)
    const y = Math.min(dragStart.y, end.y)
    const next = { x, y, width: Math.abs(end.x - dragStart.x), height: Math.abs(end.y - dragStart.y) }
    if (next.width > 0.005 && next.height > 0.005) setRegions((previous) => ({ ...previous, [activeField]: next }))
    setDragStart(null)
  }

  function loadTemplate(template) {
    setSelectedTemplateId(template.id)
    setDocumentTypeId(String(template.document_type_id))
    setTemplateName(template.name)
    setVersion(Number(template.version) || 1)
    setPageIndex(Number(template.page_index) || 0)
    setRotation(Number(template.rotation) || 0)
    setRegions(template.regions || EMPTY_REGIONS)
  }

  async function saveTemplate() {
    if (!documentTypeId || (!selectedTemplateId && !sampleFile)) return showToast?.({ title: "Missing information", description: "Select a document type and load a representative PSA sample first." }, true)
    if (!Object.values(regions).every((region) => region.width > 0 && region.height > 0)) return showToast?.({ title: "Plot all fields", description: "Draw rectangles for first, middle, and last name." }, true)
    setSaving(true)
    try {
      const payload = { documentTypeId, name: templateName, version: Number(version), pageIndex, rotation, regions }
      const url = selectedTemplateId ? `/api/recognition/templates/${selectedTemplateId}` : "/api/recognition/templates"
      const response = await fetch(url, { method: selectedTemplateId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || "Save failed")
      showToast?.({ title: "PSA template saved", description: "Coordinate recognition will use this template." })
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

  return (
    <div className="space-y-5 p-7">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50">PSA name recognition templates</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Plot normalized name-field coordinates on a representative PSA scan. Staff confirmation remains required.</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <div className="space-y-4 rounded-brand border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
          <label className="block text-xs font-semibold uppercase text-gray-500">Document type</label>
          <Select value={documentTypeId} onChange={(event) => setDocumentTypeId(event.target.value)}>
            <option value="">Select document type</option>
            {docTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </Select>
          <label className="block text-xs font-semibold uppercase text-gray-500">Template name</label>
          <input className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm" value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
          <label className="block text-xs font-semibold uppercase text-gray-500">Version</label>
          <input type="number" min="1" className="h-10 w-full rounded border border-gray-300 bg-white px-3 text-sm" value={version} onChange={(event) => setVersion(event.target.value)} />
          <label className="block text-xs font-semibold uppercase text-gray-500">Sample PSA file</label>
          <input type="file" accept="application/pdf,image/*" onChange={(event) => handleSample(event.target.files?.[0])} className="w-full text-xs" />
          {sampleFile && <p className="truncate text-xs text-gray-500">{sampleFile.name}</p>}
          {ocrPages.length > 1 && <><label className="block text-xs font-semibold uppercase text-gray-500">Page</label><Select value={pageIndex} onChange={(event) => handlePageChange(event.target.value)}>{ocrPages.map((page) => <option key={page.pageIndex} value={page.pageIndex}>Page {Number(page.pageIndex) + 1}</option>)}</Select></>}
          <label className="block text-xs font-semibold uppercase text-gray-500">Field to plot</label>
          <div className="grid grid-cols-1 gap-2">{FIELDS.map(([key, label]) => <Button key={key} type="button" variant={activeField === key ? "default" : "outline"} onClick={() => setActiveField(key)} className="justify-start" style={activeField === key ? { backgroundColor: COLORS[key] } : undefined}>{label}</Button>)}</div>
          <Button className="w-full bg-pup-maroon text-white" onClick={saveTemplate} disabled={saving || loading}>{saving ? "Saving..." : "Save template"}</Button>
        </div>

        <div className="min-w-0 rounded-brand border border-gray-200 bg-gray-100 p-4 dark:border-white/10 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between text-xs text-gray-500"><span>Drag over the printed value area for the selected field.</span><span>Coordinates: 0–1</span></div>
          {pageImage ? <div className="mx-auto w-full max-w-3xl" style={{ aspectRatio: `${pageSize.width} / ${pageSize.height}` }}>
            <div ref={imageRef} className="relative h-full w-full select-none overflow-hidden bg-white shadow" onPointerDown={startDraw} onPointerUp={finishDraw}>
              <img src={pageImage} alt="PSA calibration sample" className="absolute inset-0 h-full w-full object-contain" draggable="false" />
              {(currentPage?.observations || []).map((observation, index) => <div key={`${observation.text}-${index}`} className="pointer-events-none absolute border border-emerald-500/70 bg-emerald-400/10" style={{ left: `${observation.x * 100}%`, top: `${observation.y * 100}%`, width: `${observation.width * 100}%`, height: `${observation.height * 100}%` }} />)}
              {FIELDS.map(([key, label]) => { const region = regions[key]; return region.width > 0 && region.height > 0 ? <div key={key} className="pointer-events-none absolute border-2" style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%`, borderColor: COLORS[key] }}><span className="absolute -top-5 left-0 bg-white px-1 text-[10px] font-semibold" style={{ color: COLORS[key] }}>{label}</span></div> : null })}
            </div>
          </div> : <div className="flex h-[520px] items-center justify-center text-center text-sm text-gray-500">Load a representative PSA PDF or image to begin plotting.</div>}
        </div>

        <div className="space-y-3 rounded-brand border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-card">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Saved templates</div>
          {templates.length === 0 ? <p className="text-sm text-gray-500">No templates saved.</p> : templates.map((template) => <div key={template.id} className={`rounded border p-3 ${selectedTemplateId === template.id ? "border-pup-maroon" : "border-gray-200"}`}><button type="button" className="block w-full text-left" onClick={() => loadTemplate(template)}><div className="text-sm font-semibold">{template.document_type}</div><div className="text-xs text-gray-500">{template.name} · v{template.version} · page {Number(template.page_index) + 1}</div><div className="mt-1 text-xs text-gray-400">{template.status}</div></button>{template.status === "Active" && <button type="button" onClick={() => archiveTemplate(template.id)} className="mt-2 text-xs font-semibold text-red-700">Archive</button>}</div>)}
          <div className="rounded bg-gray-50 p-3 text-xs text-gray-500">Green boxes are OCR observations. Colored boxes are saved field regions. Use the actual displayed page bounds when plotting.</div>
        </div>
      </div>
    </div>
  )
}
