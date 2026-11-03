"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty"
import PDFPreview from "@/components/shared/PDFPreview"
import PDFPreviewModal from "@/components/shared/PDFPreviewModal"
import { REPORT_FONT_OPTIONS } from "@/lib/reportFontOptions"
import { DEFAULT_BRANDING, resolveBranding } from "@/lib/institutionalBranding"
import PageHeader from "@/components/shared/PageHeader"
import ConfirmModal from "@/components/shared/ConfirmModal"
import InstitutionalBrandingSkeleton from "./skeletons/InstitutionalBrandingSkeleton"
import { cn } from "@/lib/utils"
import { generateSampleBrandingPdf, deriveDocumentPrefix } from "@/lib/pdfGenerator"
import { AlertCircleIcon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
const DEFAULT_PUP_LOGO = "/assets/pup-logo.webp"
const OFFICIAL_FALLBACK_LOGO = "/assets/branding/black-icon.png"
const BRANDING_CACHE_KEY = "institution_branding_cache"

const COLOR_PRESETS = [
  { label: "PUP Maroon", hex: "#7A1E28" },
  { label: "State Blue", hex: "#1E40AF" },
  { label: "University Emerald", hex: "#15803D" },
  { label: "Heritage Crimson", hex: "#991B1B" },
  { label: "Academic Navy", hex: "#0F172A" },
  { label: "Institutional Gold", hex: "#B45309" },
]

export default function InstitutionalBrandingTab({ showToast }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sample, setSample] = useState(null)
  const [sampleError, setSampleError] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [removeLogoModalOpen, setRemoveLogoModalOpen] = useState(false)
  const [removeSecondaryLogoModalOpen, setRemoveSecondaryLogoModalOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSecondaryDragOver, setIsSecondaryDragOver] = useState(false)

  const [branding, setBranding] = useState(DEFAULT_BRANDING)

  const fileInputRef = useRef(null)
  const secondaryFileInputRef = useRef(null)

  const notify = useCallback(
    (msg, isError = false) => {
      if (showToast) showToast(msg, isError)
    },
    [showToast]
  )

  useEffect(() => {
    let ignore = false
    const init = async () => {
      try {
        const res = await fetch("/api/system/branding", { cache: "no-store" })
        const json = await res.json()
        if (ignore) return
        if (res.ok && json.ok && json.data) {
          setBranding(resolveBranding(json.data))
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(json.data))
            } catch {}
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("[InstitutionalBrandingTab] Fetch error:", err)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [])

  // Process File to Base64
  const processImageFile = (file) => {
    if (!file) return

    const validTypes = ["image/png", "image/webp", "image/jpeg", "image/svg+xml"]
    if (!validTypes.includes(file.type)) {
      notify("Please upload a valid image file (PNG, WebP, SVG, or JPEG)", true)
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      notify("Image size must be smaller than 3MB for offline performance", true)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result
      if (typeof base64 === "string") {
        setBranding((prev) => ({
          ...prev,
          logoBase64: base64,
          logoUrl: null,
        }))
        notify("School logo selected. Click 'Save Branding' to apply across all reports.")
      }
    }
    reader.onerror = () => {
      notify("Failed to read image file", true)
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processImageFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processImageFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleRemoveCustomLogo = () => {
    setBranding((prev) => ({
      ...prev,
      logoBase64: null,
      logoUrl: DEFAULT_PUP_LOGO,
    }))
    setRemoveLogoModalOpen(false)
    notify("Reverted to default PUP logo (eManage fallback active)")
  }

  const processSecondaryImageFile = (file) => {
    if (!file) return

    const validTypes = ["image/png", "image/webp", "image/jpeg", "image/svg+xml"]
    if (!validTypes.includes(file.type)) {
      notify("Please upload a valid image file (PNG, WebP, SVG, or JPEG)", true)
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      notify("Image size must be smaller than 3MB for offline performance", true)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result
      if (typeof base64 === "string") {
        setBranding((prev) => ({
          ...prev,
          secondaryLogoBase64: base64,
          secondaryLogoUrl: null,
        }))
        notify("Secondary seal selected. Click 'Save Branding' to apply dual-seal masthead.")
      }
    }
    reader.onerror = () => {
      notify("Failed to read image file", true)
    }
    reader.readAsDataURL(file)
  }

  const handleSecondaryFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processSecondaryImageFile(file)
  }

  const handleSecondaryDrop = (e) => {
    e.preventDefault()
    setIsSecondaryDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processSecondaryImageFile(file)
  }

  const handleSecondaryDragOver = (e) => {
    e.preventDefault()
    setIsSecondaryDragOver(true)
  }

  const handleSecondaryDragLeave = (e) => {
    e.preventDefault()
    setIsSecondaryDragOver(false)
  }

  const handleRemoveSecondaryLogo = () => {
    setBranding((prev) => ({
      ...prev,
      secondaryLogoBase64: null,
      secondaryLogoUrl: null,
    }))
    setRemoveSecondaryLogoModalOpen(false)
    notify("Secondary seal removed. Report headers restored to centered single-logo mode.")
  }

  const handleSave = async () => {
    if (!branding.institutionName?.trim()) {
      notify("Institution name cannot be blank", true)
      return
    }

    try {
      setSaving(true)
      const payload = {
        ...branding,
        documentCodePrefix: deriveDocumentPrefix(branding.institutionName, branding.campusName),
      }
      const res = await fetch("/api/system/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setBranding(json.data)
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(json.data))
            window.dispatchEvent(new CustomEvent("institution-branding-updated", { detail: json.data }))
          } catch {}
        }
        notify("Institutional identity & branding saved successfully!")
      } else {
        notify(json.error || "Failed to save branding", true)
      }
    } catch (err) {
      console.error("[InstitutionalBrandingTab] Save error:", err)
      notify("Network error saving configuration", true)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/system/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setBranding(json.data)
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(json.data))
            window.dispatchEvent(new CustomEvent("institution-branding-updated", { detail: json.data }))
          } catch {}
        }
        notify("Reverted to institutional defaults")
      } else {
        notify(json.error || "Failed to reset branding", true)
      }
    } catch (err) {
      console.error("[InstitutionalBrandingTab] Reset error:", err)
      notify("Network error resetting configuration", true)
    } finally {
      setSaving(false)
      setResetModalOpen(false)
    }
  }

  useEffect(() => {
    if (loading) return
    let active = true
    let url
    const timer = setTimeout(async () => {
      setSampleError("")
      try {
        const blob = await generateSampleBrandingPdf(branding)
        if (!active) return
        url = URL.createObjectURL(blob)
        setSample({ branding, url })
      } catch (error) {
        if (active) setSampleError(error.message || "Unable to generate the branding preview.")
      }
    }, 400)
    return () => {
      active = false
      clearTimeout(timer)
      if (url) URL.revokeObjectURL(url)
    }
  }, [branding, loading])
  const sampleReady = !loading && sample?.branding === branding && !sampleError

  const activeLogoSrc = branding.logoBase64 || branding.logoUrl || DEFAULT_PUP_LOGO
  const isCustomLogo = !!branding.logoBase64
  const activeSecondaryLogoSrc = branding.secondaryLogoBase64 || branding.secondaryLogoUrl
  const hasSecondaryLogo = !!activeSecondaryLogoSrc

  if (loading) {
    return <InstitutionalBrandingSkeleton />
  }

  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta select-none">
      {/* Main Container Card */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        <PageHeader
          icon=" Certificate01Icon"
          title={
            <div className="flex items-center gap-[6px]">
              <span>Institutional Identity</span>
              <span className="text-[12px] font-normal text-pup-maroon dark:text-red-400">
                · School Credentials &amp; Letterhead
              </span>
            </div>
          }
          description="Configure your official university seal, school credentials, administrative letterhead, and color theme for all official reports."
          showBorder={true}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">

              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewOpen(true)}
                disabled={!sampleReady}
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                {!sampleReady && !sampleError ? "Preparing PDF…" : PDF_ACTION_LABELS.preview}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setResetModalOpen(true)}
                disabled={saving}
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Restore Defaults
              </Button>

              <Button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-10 px-5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving Changes..." : "Save Branding"}
              </Button>
            </div>
          }
        />

        {/* Content Body */}
        <CardContent className="font-jakarta p-6 flex flex-[1_0_auto] flex-col gap-6 rounded-b-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN (7 cols): Settings Configuration */}
            <div className="lg:col-span-7 space-y-5">
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs dark:bg-card space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">Report Typography</h3>
                  <p className="mt-1 text-[12px] text-gray-500 dark:text-zinc-400">Choose the typeface for the letterhead, body, tables, and footers of all generated reports.</p>
                </div>
                <div>
                  <label htmlFor="report-font" className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-zinc-300">Report font</label>
                  <Select id="report-font" value={branding.reportFont || "jakarta"} onChange={(event) => setBranding((previous) => ({ ...previous, reportFont: event.target.value }))} className="h-11 w-full sm:h-10" aria-describedby="report-font-help">
                    {REPORT_FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                  </Select>
                  <p id="report-font-help" className="mt-2 text-xs text-gray-500 dark:text-zinc-400">Arial and Times New Roman options use embedded compatible fonts, Liberation Sans and Liberation Serif. The app interface keeps its current font.</p>
                </div>
              </div>
              
              {/* Card 1: Official Institutional Seals & Logos */}
              <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Official Institutional Seals &amp; Logos
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Configure your primary school seal (Left) and an optional secondary seal (Right: Republic, DepEd, CHED, or ISO badge) to activate dual-masthead letterheads.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Primary Seal */}
                  <div className="rounded-xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 truncate">
                          Primary Seal
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 shrink-0">
                          Left / Main
                        </span>
                      </div>
                      {isCustomLogo && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRemoveLogoModalOpen(true)}
                          className="h-7 px-2.5 rounded-lg text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[11px] font-semibold cursor-pointer active:scale-95 transition-all shadow-2xs"
                        >
                          Remove Seal
                        </Button>
                      )}
                    </div>

                    {/* Interactive Dropzone Area */}
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all select-none min-h-[145px]",
                        isDragOver
                          ? "border-pup-maroon bg-pup-maroon/5 dark:border-red-500 dark:bg-red-950/20"
                          : "border-border dark:border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/webp,image/svg+xml,image/jpeg"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center p-1.5 relative overflow-hidden bg-[repeating-conic-gradient(#f3f4f6_0%_25%,transparent_0%_50%)] [background-size:8px_8px] dark:bg-[repeating-conic-gradient(#18181b_0%_25%,transparent_0%_50%)] border border-border dark:border-border shadow-2xs mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeLogoSrc}
                          onError={(e) => {
                            e.currentTarget.src = OFFICIAL_FALLBACK_LOGO
                          }}
                          alt="Primary Seal"
                          className="max-w-full max-h-full object-contain filter drop-shadow-xs"
                        />
                      </div>
                      <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                        {isCustomLogo ? "Replace primary seal" : "Upload primary seal"}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                        PNG, WebP, SVG (max 3MB)
                      </p>
                    </div>
                  </div>

                  {/* Secondary / Regulatory Seal (Optional) */}
                  <div className="rounded-xl border border-border dark:border-border bg-gray-50/50 dark:bg-zinc-900/30 p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 truncate">
                          Secondary Seal
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                            hasSecondaryLogo
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              : "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
                          )}
                        >
                          {hasSecondaryLogo ? "Right / Active" : "Optional"}
                        </span>
                      </div>
                      {hasSecondaryLogo && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRemoveSecondaryLogoModalOpen(true)}
                          className="h-7 px-2.5 rounded-lg text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-[11px] font-semibold cursor-pointer active:scale-95 transition-all shadow-2xs"
                        >
                          Remove Seal
                        </Button>
                      )}
                    </div>

                    {/* Interactive Secondary Dropzone Area */}
                    <div
                      onDrop={handleSecondaryDrop}
                      onDragOver={handleSecondaryDragOver}
                      onDragLeave={handleSecondaryDragLeave}
                      onClick={() => secondaryFileInputRef.current?.click()}
                      className={cn(
                        "relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all select-none min-h-[145px]",
                        isSecondaryDragOver
                          ? "border-pup-maroon bg-pup-maroon/5 dark:border-red-500 dark:bg-red-950/20"
                          : "border-border dark:border-border bg-white dark:bg-card hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <input
                        ref={secondaryFileInputRef}
                        type="file"
                        accept="image/png,image/webp,image/svg+xml,image/jpeg"
                        onChange={handleSecondaryFileChange}
                        className="hidden"
                      />
                      {hasSecondaryLogo ? (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center p-1.5 relative overflow-hidden bg-[repeating-conic-gradient(#f3f4f6_0%_25%,transparent_0%_50%)] [background-size:8px_8px] dark:bg-[repeating-conic-gradient(#18181b_0%_25%,transparent_0%_50%)] border border-amber-200/60 dark:border-amber-900/40 shadow-2xs mb-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeSecondaryLogoSrc}
                            alt="Secondary Seal"
                            className="max-w-full max-h-full object-contain filter drop-shadow-xs"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400 dark:text-zinc-500 mb-2 border border-border dark:border-border shadow-2xs">
                          <AppIcon className=" Shield01Icon text-xl" />
                        </div>
                      )}
                      <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">
                        {hasSecondaryLogo ? "Replace secondary seal" : "Add secondary seal"}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                        Republic, CHED, DepEd, ISO
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Official School Credentials & Administrative Letterhead */}
              <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    School Credentials &amp; Letterhead
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Official institution name, campus designation, and administrative header line rendered across all official PDF records. Document tracking codes are automatically derived.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Super-Header / Jurisdiction Line */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Super-header / jurisdiction line (optional)
                      </label>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                        CHED / SUC Standard
                      </span>
                    </div>
                    <Input
                      value={branding.jurisdictionHeader ?? ""}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          jurisdictionHeader: e.target.value,
                        }))
                      }
                      placeholder="e.g. Republic of the Philippines"
                      maxLength={100}
                      className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-medium dark:border-border dark:bg-card focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                    />
                  </div>

                  {/* School / Institution Name */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                      School / institution name
                    </label>
                    <Input
                      value={branding.institutionName}
                      onChange={(e) =>
                        setBranding((prev) => ({
                          ...prev,
                          institutionName: e.target.value,
                        }))
                      }
                      placeholder="e.g. Polytechnic University of the Philippines"
                      maxLength={120}
                      className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-medium dark:border-border dark:bg-card focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                    />
                  </div>

                  {/* Campus & Office Subheader */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Campus / branch
                      </label>
                      <Input
                        value={branding.campusName}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            campusName: e.target.value,
                          }))
                        }
                        placeholder="e.g. San Juan City Campus"
                        maxLength={100}
                        className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-medium dark:border-border dark:bg-card focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                        Administrative office subheader
                      </label>
                      <Input
                        value={branding.tagline}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            tagline: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="e.g. OFFICIAL ACADEMIC ARCHIVES & RECORDS"
                        maxLength={100}
                        className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-sans tabular-nums dark:border-border dark:bg-card uppercase focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                      />
                    </div>
                  </div>

                  {/* Signatory Titles */}
                  <div className="pt-3 border-t border-border dark:border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Signatory Titles (Optional Overrides)
                      </label>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                        Leave blank for intelligent auto-defaults
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 dark:text-zinc-400 mb-1">
                          Records / Registrar Title
                        </label>
                        <Input
                          value={branding.signatoryRegistrarTitle ?? ""}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              signatoryRegistrarTitle: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder={branding.campusName ? "Default: CAMPUS REGISTRAR" : "Default: REGISTRAR"}
                          maxLength={60}
                          className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-sans tabular-nums dark:border-border dark:bg-card uppercase focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 dark:text-zinc-400 mb-1">
                          Executive Approver Title
                        </label>
                        <Input
                          value={branding.signatoryHeadTitle ?? ""}
                          onChange={(e) =>
                            setBranding((prev) => ({
                              ...prev,
                              signatoryHeadTitle: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder={branding.campusName ? "Default: CAMPUS DIRECTOR" : "Default: HEAD OF INSTITUTION"}
                          maxLength={60}
                          className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-sans tabular-nums dark:border-border dark:bg-card uppercase focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Brand Color Accent */}
              <div className="rounded-2xl border border-border dark:border-border bg-white dark:bg-card p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">
                    Official Brand Color Theme
                  </h3>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-0.5">
                    Primary institutional color applied to university titles, dividing rules, and table header accents.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center">
                      <input
                        type="color"
                        value={branding.brandColor}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            brandColor: e.target.value.toUpperCase(),
                          }))
                        }
                        className="w-10 h-10 rounded-xl border border-border dark:border-border cursor-pointer p-0 bg-transparent shadow-2xs"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        value={branding.brandColor}
                        onChange={(e) =>
                          setBranding((prev) => ({
                            ...prev,
                            brandColor: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="#7A1E28"
                        maxLength={7}
                        className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-xs font-sans tabular-nums font-semibold dark:border-border dark:bg-card uppercase focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon"
                      />
                    </div>
                  </div>

                  {/* Preset Quick-Picks */}
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1.5">
                      Recommended University Presets
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {COLOR_PRESETS.map((preset) => {
                        const isSelected = branding.brandColor.toUpperCase() === preset.hex.toUpperCase()
                        return (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() =>
                              setBranding((prev) => ({
                                ...prev,
                                brandColor: preset.hex,
                              }))
                            }
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-2xs",
                              isSelected
                                ? "border-slate-900 dark:border-white bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                                : "border-border dark:border-border bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            )}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                              style={{ backgroundColor: preset.hex }}
                            />
                            <span>{preset.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
              <div className="rounded-2xl border border-border bg-white p-6 shadow-2xs dark:bg-card space-y-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-50">Document Preview</h3>
                  <p className="mt-1 text-[12px] text-gray-500 dark:text-zinc-400">Preview your current settings in the actual report format. Save Branding to apply them to new reports.</p>
                </div>
                <div className="relative flex h-[620px] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-gray-100 dark:bg-muted" aria-busy={!sampleReady && !sampleError}>
                  {sampleError ? (
                    <div className="flex flex-1 items-center justify-center p-5">
                      <EmptyState variant="compact" icon={AlertCircleIcon} title="Preview Unavailable" description={sampleError}>
                        <Button variant="outline" onClick={() => setSampleAttempt((value) => value + 1)}>Retry Preview</Button>
                      </EmptyState>
                    </div>
                  ) : sampleReady ? (
                    <PDFPreview src={sample.url} title="Institutional document style preview" />
                  ) : (
                    <div className="flex-1 space-y-4 bg-white p-5 dark:bg-card" role="status" aria-label="Preparing document preview">
                      <Skeleton className="mx-auto h-10 w-10" />
                      <Skeleton className="mx-auto h-4 w-4/5" />
                      <Skeleton className="h-72 w-full" />
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <PDFPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Institutional Document Style Sample"
        description="Review the current branding and font before saving."
        pdfUrl={sampleReady ? sample.url : null}
        isPreparing={!sampleReady && !sampleError}
        error={sampleError}
        onRetry={() => setSampleAttempt((value) => value + 1)}
        downloadFilename="Institutional-Document-Style-Sample.pdf"
      />

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        isAppleStyled={true}
        isRestoreModal={true}
        title="Restore Default Institutional Branding"
        message="Restore the institutional names, office header, report font, signatory titles, brand color, and seals to their default settings?"
        confirmLabel="Restore Defaults"
        cancelLabel="Cancel"
        variant="warning"
        buttonIcon=" ReloadIcon"
        isLoading={saving}
        onConfirm={handleReset}
      />

      {/* Remove Primary Logo Confirmation Modal */}
      <ConfirmModal
        open={removeLogoModalOpen}
        onCancel={() => setRemoveLogoModalOpen(false)}
        isAppleStyled={true}
        title="Remove Custom Primary School Seal"
        message="This will clear your custom uploaded primary seal and revert all reports to using the default PUP logo (with eManage as offline system fallback)."
        confirmLabel="Remove Primary Seal"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={saving}
        onConfirm={handleRemoveCustomLogo}
      />

      {/* Remove Secondary Logo Confirmation Modal */}
      <ConfirmModal
        open={removeSecondaryLogoModalOpen}
        onCancel={() => setRemoveSecondaryLogoModalOpen(false)}
        isAppleStyled={true}
        title="Remove Secondary Seal"
        message="This will clear your secondary regulatory or partner seal and return all generated reports and letterheads back to centered single-logo mode."
        confirmLabel="Remove Secondary Seal"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={saving}
        onConfirm={handleRemoveSecondaryLogo}
      />
    </div>
  )
}
